function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

//ambil data penjualan
function getPenjualanData() {
    var ssSaprodi = SpreadsheetApp.openById("id spreadsheet manajemen inventory");
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");

    var sheetSaprodi = ssSaprodi.getSheetByName("PenjualanProdukAnggota");
    var sheetKeuangan = ssKeuangan.getSheetByName("Tagihan Anggota");
    var sheetProduk = ssSaprodi.getSheetByName("Product_list");

    var dataSaprodi = sheetSaprodi.getDataRange().getValues();
    var dataKeuangan = sheetKeuangan.getDataRange().getValues();
    var dataProduk = sheetProduk.getDataRange().getValues();

    var unitTypes = {};
    for (var i = 1; i < dataProduk.length; i++) {
        var namaProduk = dataProduk[i][0];
        var unitType = dataProduk[i][2];
        unitTypes[namaProduk] = unitType;
    }

    var pembayaranDicatat = {};
    for (var j = 1; j < dataKeuangan.length; j++) {
        var tanggalPembayaran = formatTanggal(dataKeuangan[j][0]); // Pastikan format tanggal konsisten
        var anggota = dataKeuangan[j][1];
        var produk = dataKeuangan[j][2];
        var jumlahBayar = parseFloat(dataKeuangan[j][3]) || 0;

        if (!pembayaranDicatat[anggota]) {
            pembayaranDicatat[anggota] = {};
        }
        if (!pembayaranDicatat[anggota][produk]) {
            pembayaranDicatat[anggota][produk] = {};
        }
        if (!pembayaranDicatat[anggota][produk][tanggalPembayaran]) {
            pembayaranDicatat[anggota][produk][tanggalPembayaran] = 0;
        }

        pembayaranDicatat[anggota][produk][tanggalPembayaran] += jumlahBayar;
    }

    var hasil = {};
    for (var k = 1; k < dataSaprodi.length; k++) {
        var tanggalTransaksi = formatTanggal(dataSaprodi[k][0]); // Pastikan tanggal transaksi konsisten
        var namaAnggota = dataSaprodi[k][1];
        var namaProduk = dataSaprodi[k][2];
        var jumlah = dataSaprodi[k][3];
        var totalHarga = parseFloat(dataSaprodi[k][4]) || 0;
        
        // **Pastikan pembayaran hanya dikaitkan dengan tanggal transaksi yang benar**
        var sudahBayar = pembayaranDicatat[namaAnggota]?.[namaProduk]?.[tanggalTransaksi] || 0;
        var sisaPembayaran = totalHarga - sudahBayar;

        if (!hasil[namaAnggota]) {
            hasil[namaAnggota] = { totalTagihan: 0, pembelian: [] };
        }

        if (sisaPembayaran > 0) {
            var unitType = unitTypes[namaProduk] || "unit";
            hasil[namaAnggota].pembelian.push({
                tanggal: tanggalTransaksi,
                namaProduk,
                jumlah: jumlah + " " + unitType,
                totalHarga,
                sudahBayar,
                sisaPembayaran
            });

            hasil[namaAnggota].totalTagihan += sisaPembayaran;
        }
    }

    // **Hapus anggota dari daftar jika semua transaksinya telah lunas**
    for (var anggota in hasil) {
        Logger.log(`Memeriksa anggota: ${anggota}, total tagihan: ${hasil[anggota].totalTagihan}`);

        if (hasil[anggota].totalTagihan <= 0) {
            Logger.log(`Menghapus anggota karena lunas: ${anggota}`);
            delete hasil[anggota];
        }
    }

    Logger.log("Data setelah perbaikan tanggal dan pembayaran: " + JSON.stringify(hasil));
    return hasil;
}



//catat pembayaran tagiah anggota
function recordPaymentAnggota(namaAnggota, namaProduk, jumlahBayar, metodeBayar, index) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetKeuangan = ssKeuangan.getSheetByName("Tagihan Anggota");

    // **Tanggal Pembelian diambil dari transaksi yang belum lunas dalam getPenjualanData()**
    var data = getPenjualanData();
    var pembelian = data[namaAnggota]?.pembelian[index];

    if (!pembelian) {
        Logger.log(`Error: Tidak ditemukan transaksi untuk anggota ${namaAnggota} pada index ${index}`);
        return data; // Pastikan pembayaran hanya dilakukan pada data yang valid
    }

    var tanggalPembelian = pembelian.tanggal; // Mengacu pada transaksi di laporan saprodi
    var tanggalPembayaran = new Date().toISOString().split("T")[0]; // Gunakan waktu saat pembayaran dilakukan

    // **Simpan transaksi pembayaran ke spreadsheet**
    sheetKeuangan.appendRow([tanggalPembelian, namaAnggota, namaProduk, jumlahBayar, metodeBayar, tanggalPembayaran]);

    // **Perbarui data pembayaran anggota**
    pembelian.sudahBayar = (pembelian.sudahBayar || 0) + jumlahBayar;
    var sisaPembayaran = pembelian.totalHarga - pembelian.sudahBayar;

    if (sisaPembayaran <= 0) {
        data[namaAnggota].pembelian.splice(index, 1); // Hapus produk jika lunas
    }

    // **Perbarui total tagihan anggota**
    data[namaAnggota].totalTagihan = data[namaAnggota].pembelian.reduce((sum, p) => sum + p.totalHarga - (p.sudahBayar || 0), 0);

    if (data[namaAnggota].totalTagihan <= 0) {
        delete data[namaAnggota]; // Hapus anggota jika semua pembelian lunas
    }

    Logger.log(`Pembayaran dicatat: ${tanggalPembelian} | ${tanggalPembayaran} | Anggota: ${namaAnggota} | Produk: ${namaProduk} | Jumlah: Rp ${jumlahBayar}`);
    return data;
}



//catat pembayaran tagihan supplier

function recordPaymentSupplier(namaSuplier, namaProduk, jumlahBayar, metodeBayar, index) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetKeuangan = ssKeuangan.getSheetByName("Tagihan Suplier");

    // **Ambil data transaksi yang belum lunas dari getPembelianData()**
    var data = getPembelianData();
    var pembelian = data[namaSuplier]?.pembelian[index];

    if (!pembelian) {
        Logger.log(`Error: Tidak ditemukan transaksi untuk supplier ${namaSuplier} pada index ${index}`);
        return data; // Pastikan pembayaran hanya dilakukan pada data yang valid
    }

    var tanggalPembelian = pembelian.tanggal; // Mengacu pada transaksi di laporan saprodi
    var tanggalPembayaran = new Date().toISOString().split("T")[0]; // Gunakan waktu saat pembayaran dilakukan

    // **Simpan transaksi pembayaran ke spreadsheet**
    sheetKeuangan.appendRow([tanggalPembelian, namaSuplier, namaProduk, jumlahBayar, metodeBayar, tanggalPembayaran]);

    // **Perbarui data pembayaran supplier**
    pembelian.sudahBayar = (pembelian.sudahBayar || 0) + jumlahBayar;
    var sisaPembayaran = pembelian.totalHarga - pembelian.sudahBayar;

    if (sisaPembayaran <= 0) {
        data[namaSuplier].pembelian.splice(index, 1); // Hapus produk jika lunas
    }

    // **Perbarui total tagihan supplier**
    data[namaSuplier].totalTagihan = data[namaSuplier].pembelian.reduce((sum, p) => sum + p.totalHarga - (p.sudahBayar || 0), 0);

    if (data[namaSuplier].totalTagihan <= 0) {
        delete data[namaSuplier]; // Hapus supplier jika semua pembelian lunas
    }

    Logger.log(`Pembayaran dicatat: ${tanggalPembelian} | ${tanggalPembayaran} | Supplier: ${namaSuplier} | Produk: ${namaProduk} | Jumlah: Rp ${jumlahBayar}`);
    return data;
}



function formatTanggal(googleSheetDate) {
    var tanggal = new Date(googleSheetDate);
    var tahun = tanggal.getFullYear();
    var bulan = ("0" + (tanggal.getMonth() + 1)).slice(-2);
    var hari = ("0" + tanggal.getDate()).slice(-2);
    return `${tahun}-${bulan}-${hari}`; // Format YYYY-MM-DD
}

//ambil data pembelian
function getPembelianData() {
  var ssSaprodi = SpreadsheetApp.openById("id spreadsheet manajemen inventory");
  var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");

  var sheetSaprodi = ssSaprodi.getSheetByName("PembelianBarang");
  var sheetKeuangan = ssKeuangan.getSheetByName("Tagihan Suplier");

  var dataSaprodi = sheetSaprodi.getDataRange().getValues();
  var dataKeuangan = sheetKeuangan.getDataRange().getValues();

  var pembayaranDicatat = {};
  for (var j = 1; j < dataKeuangan.length; j++) {
    var tanggalPembayaran = formatTanggal(dataKeuangan[j][0]);
    var suplier = dataKeuangan[j][1];
    var produk = dataKeuangan[j][2];
    var jumlahBayar = parseFloat(dataKeuangan[j][3]) || 0;

    if (!pembayaranDicatat[suplier]) {
        pembayaranDicatat[suplier] = {};
    }
    if (!pembayaranDicatat[suplier][produk]) {
        pembayaranDicatat[suplier][produk] = {};
    }
    if (!pembayaranDicatat[suplier][produk][tanggalPembayaran]) {
        pembayaranDicatat[suplier][produk][tanggalPembayaran] = 0;
    }

    pembayaranDicatat[suplier][produk][tanggalPembayaran] += jumlahBayar;

    // Debugging untuk memastikan pembayaran dicatat sesuai tanggal transaksi
    Logger.log(`Mencatat pembayaran: ${suplier} - ${produk} | Tanggal Transaksi: ${tanggalPembayaran} | Dibayar: Rp ${jumlahBayar}`);
}


  var hasil = {};
for (var k = 1; k < dataSaprodi.length; k++) {
    var tanggalTransaksi = formatTanggal(dataSaprodi[k][0]); // Format ulang dari "PembelianBarang"
    var namasuplier = dataSaprodi[k][2];
    var namaProduk = dataSaprodi[k][1];
    var jumlah = dataSaprodi[k][3];
    var totalHarga = parseFloat(dataSaprodi[k][4]) || 0;

    // **Pastikan pembayaran hanya dikaitkan dengan transaksi berdasarkan tanggalnya**
    var sudahBayar = pembayaranDicatat?.[namasuplier]?.[namaProduk]?.[tanggalTransaksi] || 0;
    var sisaPembayaran = totalHarga - sudahBayar;

    if (!hasil[namasuplier]) {
        hasil[namasuplier] = { totalTagihan: 0, pembelian: [] };
    }

    if (sisaPembayaran > 0) {
        hasil[namasuplier].pembelian.push({
            tanggal: tanggalTransaksi,
            namaProduk,
            jumlah,
            totalHarga,
            sudahBayar,
            sisaPembayaran
        });

        hasil[namasuplier].totalTagihan += sisaPembayaran;
    }

    // **Debugging tambahan untuk memastikan pembayaran benar-benar diperhitungkan**
    Logger.log(`Supplier: ${namasuplier} | Produk: ${namaProduk} | Tanggal Transaksi: ${tanggalTransaksi} | Sudah Dibayar: Rp ${sudahBayar} | Sisa Tagihan: Rp ${sisaPembayaran}`);
}


for (var supplier in hasil) {
    Logger.log(`Memeriksa supplier: ${supplier}, total tagihan: ${hasil[supplier].totalTagihan}`);

    if (hasil[supplier].totalTagihan <= 0) {
        Logger.log(`Menghapus supplier karena lunas: ${supplier}`);
        delete hasil[supplier];
    }
}



  Logger.log("Data setelah pembayaran diterapkan ke tanggal transaksi yang benar: " + JSON.stringify(hasil));
  return hasil;
}


function getCekPembelianData() {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    SpreadsheetApp.flush();
    var sheetKeuangan = ssKeuangan.getSheetByName("Tagihan Suplier");

    if (!sheetKeuangan) {
        console.error("Sheet 'Tagihan Suplier' tidak ditemukan!");
        return {};
    }

    var dataKeuangan = sheetKeuangan.getDataRange().getValues();
    if (dataKeuangan.length === 0) {
        console.error("Data 'Tagihan Suplier' kosong atau tidak bisa diakses.");
        return {};
    }

    Logger.log("Data dari 'Tagihan Suplier' berhasil diambil: " + JSON.stringify(dataKeuangan));
    Logger.log("Jumlah baris dalam 'Tagihan Suplier': " + dataKeuangan.length);
Logger.log("Contoh data baris pertama: " + JSON.stringify(dataKeuangan[0]));

    return dataKeuangan;
}


//catat biaya operasional
function recordCashTransaction(sheetName, tanggal, jumlah, kategori, keterangan) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetCash = ssKeuangan.getSheetByName(sheetName);

    if (!sheetCash) {
        return "Gagal mencatat: Sheet '" + sheetName + "' tidak ditemukan!";
    }

    sheetCash.appendRow([tanggal, jumlah, kategori, keterangan]);

    Logger.log(`Transaksi dicatat: ${sheetName} | ${tanggal} | Rp ${jumlah} | ${kategori} | ${keterangan}`);

    return "Pencatatan berhasil!";
}


//laporan keuangan


//data laporan keuangan bulanan
function updateLaporanKeuangan() {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetLaporan = ssKeuangan.getSheetByName("laporan keuangan");
    var sheetTagihanAnggota = ssKeuangan.getSheetByName("Tagihan Anggota");
    var sheetCashMasuk = ssKeuangan.getSheetByName("cash masuk");
    var sheetTagihanSuplier = ssKeuangan.getSheetByName("Tagihan Suplier");
    var sheetCashKeluar = ssKeuangan.getSheetByName("cash keluar");

    var laporanData = sheetLaporan.getDataRange().getValues();
    var lastRow = laporanData.length > 1 ? laporanData[laporanData.length - 1] : null;
    var prevSaldoAkhir = lastRow ? lastRow[4] : 0; // Ambil saldo akhir bulan sebelumnya

    var currentMonth = new Date().getMonth() + 1; // Bulan sekarang (1-12)
    var currentYear = new Date().getFullYear(); // Tahun sekarang

    var totalPendapatan = hitungTotalPendapatan(sheetTagihanAnggota, sheetCashMasuk, currentMonth, currentYear);
    var totalPengeluaran = hitungTotalPengeluaran(sheetTagihanSuplier, sheetCashKeluar, currentMonth, currentYear);
    var saldoAkhir = prevSaldoAkhir + totalPendapatan - totalPengeluaran;

    // **Periksa apakah laporan bulan ini sudah ada**
    var existingRow = laporanData.find(row => row[0] == `${currentYear}-${currentMonth}`);
    if (!existingRow) {
        sheetLaporan.appendRow([`${currentYear}-${currentMonth}`, prevSaldoAkhir, totalPendapatan, totalPengeluaran, saldoAkhir]);
        Logger.log(`Menambahkan laporan bulan ${currentMonth}-${currentYear} dengan saldo akhir Rp ${saldoAkhir}`);
    } else {
        Logger.log(`Laporan bulan ${currentMonth}-${currentYear} sudah ada, tidak menambahkan data.`);
    }
}

function updateManualLaporanKeuangan(bulan, tahun) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetLaporan = ssKeuangan.getSheetByName("laporan keuangan");
    var sheetTagihanAnggota = ssKeuangan.getSheetByName("Tagihan Anggota");
    var sheetCashMasuk = ssKeuangan.getSheetByName("cash masuk");
    var sheetTagihanSuplier = ssKeuangan.getSheetByName("Tagihan Suplier");
    var sheetCashKeluar = ssKeuangan.getSheetByName("cash keluar");

    var laporanData = sheetLaporan.getDataRange().getValues();
    var lastRow = laporanData.length > 1 ? laporanData[laporanData.length - 1] : null;
    var prevSaldoAkhir = lastRow ? lastRow[4] : 0; // Ambil saldo akhir bulan sebelumnya

    var totalPendapatan = hitungTotalPendapatan(sheetTagihanAnggota, sheetCashMasuk, bulan, tahun);
    var totalPengeluaran = hitungTotalPengeluaran(sheetTagihanSuplier, sheetCashKeluar, bulan, tahun);
    var saldoAkhir = prevSaldoAkhir + totalPendapatan - totalPengeluaran;

    // **Periksa apakah laporan bulan ini sudah ada**
    var existingRow = laporanData.find(row => row[0] == `${tahun}-${bulan}`);
    if (!existingRow) {
        sheetLaporan.appendRow([`${tahun}-${bulan}`, prevSaldoAkhir, totalPendapatan, totalPengeluaran, saldoAkhir]);
        Logger.log(`✅ Menambahkan laporan bulan ${bulan}-${tahun} dengan saldo akhir Rp ${saldoAkhir}`);
    } else {
        Logger.log(`⚠️ Laporan bulan ${bulan}-${tahun} sudah ada, tidak menambahkan data.`);
    }
}

function testUpdateLaporan() {
    updateManualLaporanKeuangan(4, 2025); // Menjalankan laporan keuangan untuk Maret 2025
}



function hitungTotalPendapatan(sheetTagihanAnggota, sheetCashMasuk, bulan, tahun) {
    var dataTagihanAnggota = sheetTagihanAnggota.getDataRange().getValues();
    var dataCashMasuk = sheetCashMasuk.getDataRange().getValues();

    var pendapatan = dataTagihanAnggota.filter(row => {
        var tanggalPembayaran = new Date(row[5]); // Ambil kolom "Tanggal Pembayaran"
        return tanggalPembayaran.getMonth() + 1 == bulan && tanggalPembayaran.getFullYear() == tahun;
    }).reduce((sum, row) => sum + row[3], 0);

    var pemasukanLain = dataCashMasuk.filter(row => {
        var tanggalPemasukan = new Date(row[0]); // Ambil kolom "Tanggal"
        return tanggalPemasukan.getMonth() + 1 == bulan && tanggalPemasukan.getFullYear() == tahun;
    }).reduce((sum, row) => sum + row[1], 0);

    return pendapatan + pemasukanLain;
}

function hitungTotalPengeluaran(sheetTagihanSuplier, sheetCashKeluar, bulan, tahun) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    
    var sheetTagihanSuplier = ssKeuangan.getSheetByName("Tagihan Suplier");
    var sheetCashKeluar = ssKeuangan.getSheetByName("cash keluar");
    var dataTagihanSuplier = sheetTagihanSuplier.getDataRange().getValues();
    var dataCashKeluar = sheetCashKeluar.getDataRange().getValues();

    var pengeluaranBelanja = dataTagihanSuplier.filter(row => {
        var tanggalPembayaran = new Date(row[5]); // Ambil kolom "Tanggal Bayar"
        return tanggalPembayaran.getMonth() + 1 == bulan && tanggalPembayaran.getFullYear() == tahun;
    }).reduce((sum, row) => sum + row[3], 0);

    var pengeluaranLain = dataCashKeluar.filter(row => {
        var tanggalPengeluaran = new Date(row[0]); // Ambil kolom "Tanggal"
        return tanggalPengeluaran.getMonth() + 1 == bulan && tanggalPengeluaran.getFullYear() == tahun;
    }).reduce((sum, row) => sum + row[1], 0);
    
    return pengeluaranBelanja + pengeluaranLain;
    
}

function debugHitungTotalPengeluaran(){
  var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    
    var sheetTagihanSuplier = ssKeuangan.getSheetByName("Tagihan Suplier");
    var sheetCashKeluar = ssKeuangan.getSheetByName("cash keluar");
 hitungTotalPengeluaran(sheetTagihanSuplier, sheetCashKeluar, 6, 2025);
 console.log("pengeluaranBelanja")
}

function perbaruiLaporanKeuanganBulanan() {
    updateLaporanKeuangan(); // Panggil fungsi setiap awal bulan secara otomatis
}


function getLaporanKeuanganBulanan(bulan, tahun) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetLaporan = ssKeuangan.getSheetByName("laporan keuangan");

    var dataLaporan = sheetLaporan.getDataRange().getValues();
    
    // Ambil saldo akhir bulan sebelumnya sebagai saldo awal bulan ini
    var tanggalSpreadsheet;
    var laporanBulanSebelumnya = dataLaporan.find(row => {
        tanggalSpreadsheet = new Date(row[0]);
        return tanggalSpreadsheet.getMonth() + 1 == bulan - 1 && tanggalSpreadsheet.getFullYear() == tahun;
    });

    var saldoAwal = laporanBulanSebelumnya ? laporanBulanSebelumnya[4] : 0;

    var totalPendapatan = hitungTotalPendapatan(ssKeuangan.getSheetByName("Tagihan Anggota"), ssKeuangan.getSheetByName("Cash Masuk"), bulan, tahun);
    var totalPengeluaran = hitungTotalPengeluaran(ssKeuangan.getSheetByName("Tagihan Supplier"), ssKeuangan.getSheetByName("Cash Keluar"), bulan, tahun);
    
    var saldoAkhir = saldoAwal + totalPendapatan - totalPengeluaran;

    

    var laporanKeuangan = {
        saldoAwal: saldoAwal,
        totalPendapatan: totalPendapatan,
        totalPengeluaran: totalPengeluaran,
        saldoAkhir: saldoAkhir,
        tagihanAnggota: getPenjualanData(),
        tagihanSupplier: getPembelianData()
    };

    Logger.log(`Laporan keuangan realtime untuk bulan ${bulan}-${tahun}: ${JSON.stringify(laporanKeuangan)}`);
    return laporanKeuangan;
}


function getDetailTransaksiBulanan(bulan, tahun) {
    var ssKeuangan = SpreadsheetApp.openById("id spreadsheet manajemen keuangan");
    var sheetTagihanAnggota = ssKeuangan.getSheetByName("Tagihan Anggota");
    var sheetCashMasuk = ssKeuangan.getSheetByName("cash masuk");
    var sheetTagihanSuplier = ssKeuangan.getSheetByName("Tagihan Suplier");
    var sheetCashKeluar = ssKeuangan.getSheetByName("cash keluar");

    var transaksiMap = {}; // **Gunakan objek untuk menggabungkan transaksi dalam tanggal yang sama**

    function tambahkanTransaksi(tanggal, jenis, kategori, jumlah) {
        var formattedDate = formatTanggal(tanggal);
        var key = `${formattedDate}-${kategori}`;
        if (!transaksiMap[key]) {
            transaksiMap[key] = { tanggal: formattedDate, jenis, kategori, jumlah: 0 };
        }
        transaksiMap[key].jumlah += jumlah;
    }

    // **1. Pemasukan: Pembayaran Anggota**
    sheetTagihanAnggota.getDataRange().getValues().forEach(row => {
        var tanggalPembayaran = row[5]; // Kolom ke-6: Tanggal Pembayaran
        if (new Date(tanggalPembayaran).getMonth() + 1 == bulan && new Date(tanggalPembayaran).getFullYear() == tahun) {
            tambahkanTransaksi(tanggalPembayaran, "Pemasukan", "Pembayaran Anggota", row[3]); // Kolom ke-4: Jumlah Pembayaran
        }
    });

    // **2. Pemasukan: Cash Masuk (Kategori Lainnya)**
    sheetCashMasuk.getDataRange().getValues().forEach(row => {
        var tanggal = row[0]; // Kolom ke-1: Tanggal
        var kategori = row[2]; // Kolom ke-3: Kategori
        if (new Date(tanggal).getMonth() + 1 == bulan && new Date(tanggal).getFullYear() == tahun) {
            tambahkanTransaksi(tanggal, "Pemasukan", kategori, row[1]); // Kolom ke-2: Jumlah
        }
    });

    // **3. Pengeluaran: Pembelian Barang**
    sheetTagihanSuplier.getDataRange().getValues().forEach(row => {
        var tanggalPembayaran = row[5]; // Kolom ke-6: Tanggal Pembayaran
        if (new Date(tanggalPembayaran).getMonth() + 1 == bulan && new Date(tanggalPembayaran).getFullYear() == tahun) {
            tambahkanTransaksi(tanggalPembayaran, "Pengeluaran", "Pembelian Barang", row[3]); // Kolom ke-4: Jumlah Pembayaran
        }
    });

    // **4. Pengeluaran: Cash Keluar (Kategori Lainnya)**
    sheetCashKeluar.getDataRange().getValues().forEach(row => {
        var tanggal = row[0]; // Kolom ke-1: Tanggal
        var kategori = row[2]; // Kolom ke-3: Kategori
        if (new Date(tanggal).getMonth() + 1 == bulan && new Date(tanggal).getFullYear() == tahun) {
            tambahkanTransaksi(tanggal, "Pengeluaran", kategori, row[1]); // Kolom ke-2: Jumlah
        }
    });

    // **Konversi objek ke array transaksi terurut berdasarkan tanggal**
    return Object.values(transaksiMap).sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
}

