// ============================================================
// SCANNER.JS — html5-qrcode bilan QR skanerlash (TEZLASHTIRILGAN)
// ============================================================

const ScannerManager = {
  scanner: null,
  isRunning: false,
  beepBuffer: null,
  lastScanned: null,
  cooldown: false,

  // Beep ovoz yaratish (Web Audio API)
  initBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) { console.log('Audio err:', e); }
  },

  playBeep(success = true) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(success ? 1047 : 330, ctx.currentTime);
      if (!success) oscillator.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (success ? 0.25 : 0.4));
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + (success ? 0.25 : 0.4));
    } catch (e) {}
  },

  start(onSuccess) {
    if (this.isRunning) return;
    this.initBeep(); // Ovozni yoqish (Unlock audio)
    const html5QrCode = new Html5Qrcode('reader');
    this.scanner = html5QrCode;

    // ========================================
    // TEZLASHTIRILGAN KAMERA SOZLAMALARI
    // ========================================
    const scanConfig = {
      fps: 60,                              // Yana ham tezroq (30 -> 60 FPS)
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], // Faqat QR kodlarni o'qiydi (tezlikni juda oshiradi)
      qrbox: function(viewfinderWidth, viewfinderHeight) {
        // Kattaroq skanerlash maydoni = tezroq tanish
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.floor(minEdge * 0.85); // 85% maydoni skanerga
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
      disableFlip: false,
      // Skanerlash vaqtini oshirish uchun experimental sozlamalar
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true   // BarcodeDetector API (Chrome 83+, tezroq)
      }
    };

    // Kamerani yuqori sifatda ochish uchun constraints
    const cameraConstraints = {
      facingMode: "environment",    // Orqa kamera
      width: { ideal: 1280 },      // Yuqori sifat = tezroq QR tanish
      height: { ideal: 720 },
      focusMode: "continuous",      // Doim fokus
      exposureMode: "continuous"
    };

    // Avval kameralar ro'yxatini olishga harakat qilamiz
    Html5Qrcode.getCameras().then(cameras => {
      if (!cameras || cameras.length === 0) {
        this.showError('Kamera topilmadi!');
        return;
      }

      // Orqa kamerani topish
      const backCam = cameras.find(c => {
        const label = c.label.toLowerCase();
        return label.includes('back') || label.includes('rear') || label.includes('environment');
      });

      // Agar orqa kamera topilsa, uning ID sidan foydalanamiz
      // Aks holda cameraConstraints ishlatamiz
      let cameraConfig;
      if (backCam) {
        cameraConfig = backCam.id;
      } else if (cameras.length === 1) {
        cameraConfig = cameras[0].id;
      } else {
        // facingMode bilan ishga tushiramiz
        cameraConfig = { facingMode: "environment" };
      }

      html5QrCode.start(
        cameraConfig,
        scanConfig,
        (decodedText) => this.onScan(decodedText, onSuccess),
        (err) => {} // suppress errors
      ).then(() => {
        this.isRunning = true;
        document.getElementById('scanner-status')?.classList.add('active');

        // Kamerani torch/focus qo'shimcha optimizatsiya
        this._optimizeCamera(html5QrCode);
      }).catch(err => {
        // Agar birinchi urinish muvaffaqiyatsiz bo'lsa, oddiy config bilan qayta urinish
        console.warn('Birinchi urinish muvaffaqiyatsiz, qayta urinilmoqda...', err);
        html5QrCode.start(
          cameras[0].id,
          { fps: 30, formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ], qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decodedText) => this.onScan(decodedText, onSuccess),
          (err) => {}
        ).then(() => {
          this.isRunning = true;
        }).catch(err2 => {
          this.showError('Kamera ishga tushmadi: ' + err2);
        });
      });
    }).catch(err => {
      this.showError('Kamera ruxsati berilmadi yoki mavjud emas!');
    });
  },

  // Kamerani qo'shimcha optimizatsiya
  _optimizeCamera(html5QrCode) {
    try {
      const videoElem = document.querySelector('#reader video');
      if (videoElem && videoElem.srcObject) {
        const track = videoElem.srcObject.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          const settings = {};

          // Avtofokus yoqish
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            settings.focusMode = 'continuous';
          }

          // Torch (chiroq) — qorong'i joyda yordam beradi
          // settings.torch = true; // Keraksiz bo'lsa comment qiling

          if (Object.keys(settings).length > 0) {
            track.applyConstraints({ advanced: [settings] }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.log('Camera optimization failed (this is okay):', e);
    }
  },

  stop() {
    if (this.scanner && this.isRunning) {
      this.scanner.stop().then(() => {
        this.isRunning = false;
        document.getElementById('scanner-status')?.classList.remove('active');
      }).catch(e => {});
    }
  },

  async onScan(decodedText, onSuccess) {
    // Cooldown — takroriy skanerlashni oldini olish
    // 800ms -> 400ms ga qisqartirildi (tezroq ketma-ket skanerlash)
    if (this.cooldown) return;
    this.cooldown = true;
    setTimeout(() => { this.cooldown = false; }, 400);

    // QR ma'lumotini parse qilish
    // Format: TEACHER:id yoki STUDENT:id
    let personType = null;
    let personId = null;

    if (decodedText.startsWith('TEACHER:')) {
      personType = 'teacher';
      personId = decodedText.replace('TEACHER:', '');
    } else if (decodedText.startsWith('STUDENT:')) {
      personType = 'student';
      personId = decodedText.replace('STUDENT:', '');
    } else {
      this.showResult({ error: true, message: 'Noto\'g\'ri QR kod!' });
      this.playBeep(false);
      return;
    }

    // API orqali davomat qo'shish (async)
    const result = await DB.addAttendance(personId, personType);
    // Ma'lumotlarni LocalStorage dan olish (pullFromAPI dan keyin yangilangan)
    let person = personType === 'teacher' ? DB.getTeacherById(personId) : DB.getStudentById(personId);

    if (result.error) {
      this.playBeep(false);
      this.showResult({
        error: true,
        warning: false,
        person,
        message: result.message || 'Xatolik yuz berdi!',
        time: result.record ? result.record.time : '',
      });
    } else {
      this.playBeep(true);
      const isExit = result.type === 'chiqish';
      this.showResult({
        error: false,
        warning: false,
        person,
        balls: isExit ? 0 : 3, // Faqat kirganda ball beramiz, yoki xohlasangiz 0 qiling
        message: `${person?.name || 'Noma\'lum'} — ${isExit ? 'Chiqdi (Xayr)' : 'Kirdi! +3 ball 🎉'}`,
        time: isExit ? (result.record ? result.record.timeOut : '') : (result.record ? result.record.time : ''),
      });
    }

    if (onSuccess) onSuccess(result, person, personType);
  },

  showResult(data) {
    const el = document.getElementById('scan-result');
    if (!el) return;
    el.innerHTML = '';
    el.className = 'scan-result ' + (data.error ? 'error' : data.warning ? 'warning' : 'success');

    const icon = data.error ? '❌' : data.warning ? '⚠️' : '✅';
    el.innerHTML = `
      <div class="scan-icon">${icon}</div>
      <div class="scan-info">
        <div class="scan-name">${data.message}</div>
        ${data.time ? `<div class="scan-time">Vaqt: ${data.time}</div>` : ''}
        ${data.balls ? `<div class="scan-balls">+${data.balls} ball qo'shildi 🏆</div>` : ''}
      </div>
    `;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 4000);
  },

  showError(msg) {
    const el = document.getElementById('scan-result');
    if (el) {
      el.className = 'scan-result error show';
      el.innerHTML = `<div class="scan-icon">❌</div><div class="scan-info"><div class="scan-name">${msg}</div></div>`;
    }
  },
};
