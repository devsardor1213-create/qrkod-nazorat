// ============================================================
// QR.JS — QR Kod generatsiya va yuklab olish
// ============================================================

const QRManager = {
  // QR kod generatsiya (canvas ga)
  generate(containerId, data, size = 200) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    // qrcode.js kutubxonasi ishlatiladi (CDN orqali yuklanadi)
    new QRCode(container, {
      text: data,
      width: size,
      height: size,
      colorDark: '#6C63FF',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });
  },

  // QR kodni PNG sifatida yuklab olish
  download(containerId, filename) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const canvas = container.querySelector('canvas');
    const img = container.querySelector('img');

    if (canvas) {
      const link = document.createElement('a');
      link.download = filename + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } else if (img) {
      // img dan canvas yaratamiz
      const cvs = document.createElement('canvas');
      cvs.width = 220;
      cvs.height = 260;
      const ctx = cvs.getContext('2d');

      // Fon
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 220, 260);

      // QR rasmni chizish
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 10, 10, 200, 200);
        // Kodni yozish
        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(filename.split('_').pop() || '', 110, 245);
        const link = document.createElement('a');
        link.download = filename + '.png';
        link.href = cvs.toDataURL('image/png');
        link.click();
      };
      qrImg.src = img.src;
    }
  },

  // Canvas + kod raqami bilan chiroyli QR yaratish
  generateWithCode(containerId, qrData, code, personName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      background: white; padding: 16px; border-radius: 12px;
      display: inline-flex; flex-direction: column; align-items: center; gap: 8px;
      box-shadow: 0 4px 20px rgba(108,99,255,0.2);
    `;

    const qrDiv = document.createElement('div');
    qrDiv.id = containerId + '_inner';
    wrapper.appendChild(qrDiv);

    const nameEl = document.createElement('div');
    nameEl.textContent = personName || '';
    nameEl.style.cssText = 'font-size:12px; color:#333; font-weight:600; text-align:center; max-width:180px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;';

    const codeEl = document.createElement('div');
    codeEl.textContent = code || '';
    codeEl.style.cssText = 'font-size:32px; font-weight:900; color:#6C63FF; letter-spacing:8px; font-family:monospace;';

    wrapper.appendChild(nameEl);
    wrapper.appendChild(codeEl);
    container.appendChild(wrapper);

    new QRCode(qrDiv, {
      text: qrData,
      width: 180,
      height: 180,
      colorDark: '#1a1a2e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H,
    });
  },

  // Ekrandan QR kodini yuklab olish (html2canvas yoki manual)
  downloadCard(wrapperId, filename) {
    const el = document.getElementById(wrapperId);
    if (!el) return;
    // html2canvas mavjud bo'lsa
    if (typeof html2canvas !== 'undefined') {
      html2canvas(el, { backgroundColor: null, scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    } else {
      this.download(wrapperId, filename);
    }
  },
};
