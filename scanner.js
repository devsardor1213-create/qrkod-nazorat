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
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }
      this.initBeep();
      const html5QrCode = new Html5Qrcode('reader');
      this.scanner = html5QrCode;

      const scanConfig = {
        fps: 60,
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        qrbox: function(viewfinderWidth, viewfinderHeight) {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.85);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        disableFlip: false
      };

      const camSelect = document.getElementById('cameraSelect');

      // Always request cameras first to get permissions and correct IDs
      Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length > 0) {
          // Populate select if it's empty
          if (camSelect && camSelect.options.length <= 2) {
            camSelect.innerHTML = '';
            cameras.forEach((cam, index) => {
              const option = document.createElement('option');
              option.value = cam.id;
              option.text = cam.label || `Kamera ${index + 1}`;
              camSelect.appendChild(option);
            });
            // Try to auto-select back camera
            const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment') || c.label.toLowerCase().includes('orqa'));
            if (backCam) {
              camSelect.value = backCam.id;
            }
          }

          let cameraIdToStart = cameras[0].id; // default to first
          if (camSelect && camSelect.value && camSelect.value !== 'environment' && camSelect.value !== 'user') {
            cameraIdToStart = camSelect.value;
          } else {
            const backCam = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('environment') || c.label.toLowerCase().includes('orqa'));
            if (backCam) cameraIdToStart = backCam.id;
          }

          html5QrCode.start(
            cameraIdToStart,
            scanConfig,
            (decodedText) => this.onScan(decodedText, onSuccess),
            (err) => {}
          ).then(() => {
            this.isRunning = true;
            document.getElementById('scanner-status')?.classList.add('active');
            this._optimizeCamera(html5QrCode);
            resolve();
          }).catch(err => {
            this.showError('Kamera xatosi: ' + err);
            reject(err);
          });
        } else {
          reject("Kameralar ro'yxati bo'sh!");
        }
      }).catch(err => {
        // Fallback if getCameras fails
        let fallbackConfig = { facingMode: "environment" };
        if (camSelect && (camSelect.value === 'user' || camSelect.value === 'environment')) {
            fallbackConfig = { facingMode: camSelect.value };
        }
        
        html5QrCode.start(
          fallbackConfig,
          scanConfig,
          (decodedText) => this.onScan(decodedText, onSuccess),
          (err) => {}
        ).then(() => {
          this.isRunning = true;
          document.getElementById('scanner-status')?.classList.add('active');
          resolve();
        }).catch(err2 => {
          this.showError('Kamera ruxsati berilmadi yoki xato: ' + err2);
          reject(err2);
        });
      });
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

  isProcessing: false,

  async onScan(decodedText, onSuccess) {
    // Agar bitta QR kod tekshirilayotgan bo'lsa yoki kutish vaqti tugamagan bo'lsa, e'tiborga olmaslik
    if (this.isProcessing || this.cooldown) return;
    this.isProcessing = true;
    
    // Keyingi skanerni 3 soniyaga to'xtatib turish
    this.cooldown = true;
    setTimeout(() => { this.cooldown = false; }, 3000);

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
        balls: (isExit || personType !== 'student') ? 0 : 3, // Faqat o'quvchi kirganda 3 ball beramiz
        message: `${person?.name || 'Noma\'lum'} — ${isExit ? 'Chiqdi (Xayr)' : 'Kirdi! +3 ball 🎉'}`,
        time: isExit ? (result.record ? result.record.timeOut : '') : (result.record ? result.record.time : ''),
      });
    }

    if (onSuccess) onSuccess(result, person, personType);
    this.isProcessing = false;
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
