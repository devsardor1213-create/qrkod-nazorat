// ============================================================
// PDF.JS — jsPDF bilan PDF generatsiya
// ============================================================

const PDFManager = {
  generateAttendance(person, personType, monthData, year, month) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      alert('PDF kutubxonasi yuklanmadi!');
      return;
    }
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const monthNames = [
      '', 'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
    ];

    const pageW = 210;
    const margin = 15;
    let y = 20;

    // ---- Header ----
    doc.setFillColor(108, 99, 255);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('DAVOMAT HISOBOTI', pageW / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`QR Kod Davomat Tizimi`, pageW / 2, 25, { align: 'center' });

    y = 45;

    // ---- Person info ----
    doc.setTextColor(30, 30, 60);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Shaxs ma\'lumotlari:', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);

    const infos = [
      ['Ismi:', person.name + (person.surname ? ' ' + person.surname : '')],
      ['Telefon:', person.phone || '-'],
      ['Turi:', personType === 'teacher' ? 'O\'qituvchi' : 'O\'quvchi'],
      ['Kod:', person.code || '-'],
      ['Hisobot oyi:', `${monthNames[month]} ${year}`],
    ];

    if (personType === 'teacher') infos.push(['Ish turi:', person.jobType || '-']);
    if (personType === 'student') {
      const group = DB.getGroupById(person.groupId);
      const teacher = DB.getTeacherById(person.teacherId);
      infos.push(['Guruh:', group ? group.name : '-']);
      infos.push(['O\'qituvchi:', teacher ? teacher.name + ' ' + teacher.surname : '-']);
    }

    infos.forEach(([label, val]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(108, 99, 255);
      doc.text(label, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 80);
      doc.text(val, margin + 35, y);
      y += 7;
    });

    y += 5;

    // ---- Summary box ----
    doc.setFillColor(240, 240, 255);
    doc.roundedRect(margin, y, pageW - 2 * margin, 22, 4, 4, 'F');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 60);

    const boxW = (pageW - 2 * margin) / 3;
    doc.text(`Ish kunlari: ${monthData.workDays}`, margin + 5, y + 8);
    doc.setTextColor(0, 180, 130);
    doc.text(`Keldi: ${monthData.cameDays}`, margin + boxW + 5, y + 8);
    doc.setTextColor(220, 60, 60);
    doc.text(`Kelmadi: ${monthData.notCameDays}`, margin + 2 * boxW + 5, y + 8);

    const percent = monthData.workDays ? Math.round((monthData.cameDays / monthData.workDays) * 100) : 0;
    doc.setTextColor(60, 60, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`Davomat foizi: ${percent}%`, margin + 5, y + 17);
    y += 30;

    // ---- Table header ----
    doc.setFillColor(108, 99, 255);
    doc.rect(margin, y, pageW - 2 * margin, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const colX = [margin + 3, margin + 25, margin + 55, margin + 95, margin + 130];
    ['#', 'Sana', 'Kun', 'Holat', 'Vaqt'].forEach((h, i) => doc.text(h, colX[i], y + 6));
    y += 9;

    // ---- Table rows ----
    doc.setFontSize(10);
    const workDays = monthData.days.filter(d => !d.isWeekend);
    workDays.forEach((day, idx) => {
      if (y > 265) { doc.addPage(); y = 20; }
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(248, 247, 255);
        doc.rect(margin, y, pageW - 2 * margin, 8, 'F');
      }
      doc.setTextColor(80, 80, 100);
      doc.setFont('helvetica', 'normal');
      doc.text(String(idx + 1), colX[0], y + 5.5);
      doc.text(day.date, colX[1], y + 5.5);
      doc.text(day.dayName, colX[2], y + 5.5);
      if (day.came) {
        doc.setTextColor(0, 160, 120);
        doc.setFont('helvetica', 'bold');
        doc.text('Keldi', colX[3], y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 100);
        doc.text(day.time || '-', colX[4], y + 5.5);
      } else {
        doc.setTextColor(200, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text('Kelmadi', colX[3], y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 100);
        doc.text('-', colX[4], y + 5.5);
      }
      y += 8;
    });

    // ---- Footer ----
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 180);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Chop etildi: ${new Date().toLocaleString('uz-UZ')} | QR Davomat Tizimi`,
        pageW / 2, 290, { align: 'center' }
      );
      doc.text(`${i} / ${pageCount}`, pageW - margin, 290, { align: 'right' });
    }

    // Saqlash
    const fname = `${person.name}_${monthNames[month]}_${year}_davomat.pdf`;
    doc.save(fname);
  },
};
