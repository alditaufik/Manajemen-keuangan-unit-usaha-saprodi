# Aplikasi Manajemen Keuangan Unit Usaha Saprodi Koperasi Produsen Najafarm Berkah
Ini adalah proyek aplikasi web berbasis google appcript yang saya buat dan saya gunakan untuk membantu pekerjaan saya dalam mengelola keuangan unit usaha saprodi koperasi produsen najafarm berkah.

![arus kas bulanan](https://github.com/user-attachments/assets/7c83ef47-fa5f-4c8c-aa9f-9dc3b06d5df6)


data yang ditampilkan dalam screenshoot adalah dummy untuk test aplikasi


## Kenapa menggunakan Appscript?
- sesuai dengan kebutuhan pendataan yang tidak begitu kompleks namun mampu melakukan pekejaan repetitif menjadi otomatis
- tidak rumit dalam pembuatan karena hanya menggunakan HTML, css bootstrap dan javacript pada frontend dan untuk backend menggunakan javascript dan kode appcript.
- tentu saja gratis.

## Fitur
- laporan arus kas bulanan ![arus kas bulanan](https://github.com/user-attachments/assets/f37fec22-def5-4853-aa76-60d7888a325f)
- pelacakan pembayaran anggota koperasi, melacak sisa pembayran jika pembayaran dilakukan secara angsuran ![tagihan anggota](https://github.com/user-attachments/assets/88ea46d2-5b56-4bf4-91bf-2a61a0545ed7)
- pelacakan pembayaran tagihan supplier, melacak sisa pembayaran kepada supplier jika pembayaran dilakukan secara angsuran ![tagihan supplier](https://github.com/user-attachments/assets/f05aa22a-52ca-4d0c-9530-4dd6051fa6b4)
- pencatatan arus kas masuk dan keluar selain pembayaran anggota dan pembayran supplier




## Instalasi
- buat 2 file google spreadsheet yang akan menyimpan data transaksi inventory dan data keuangan.
- spreadsheet inventory terdiri dari beberapa sheet
  -  sheet Product_list dengan kolom Nama barang,	harga satuan,	satuan,	Stok Tersedia.
  -  sheet Anggota_Koperasi dengan kolom Nama Lengkap,	No HP, 	Alamat.
  -  sheet OrderSaprodiAnggota dengan kolom Tanggal Order,	Nama Anggota,	Produk order,	Jumlah Order.
  -  sheet PembelianBarang dengan kolom tanggal beli,	nama produk,	nama penyedia barang,	jumlah beli,	total harga beli.
  -  sheet PenjualanProdukAnggota dengan kolom Tanggal,	Nama Anggota,	Nama Produk,	Jumlah pembelian,	Total harga.
  -  sheet LaporanBulanan dengan kolom Bulan,	Tahun,	Produk,	Stok Awal,	Pemeblian (jumlah),	pembelian (harga),	Penjualan (jumlah),	Penjualan (Harga),	Stok Akhir,
  -  sheet ini digunakan dalam aplikasi pengelolaan inventory, silahkan lihat disini: https://github.com/alditaufik/Manajemen-Inventory-Unit-Usaha-Saprodi
- spradsheet Keuangan yang terdiri dari beberapa sheet
  - sheet Tagihan Anggota dengan kolom Tanggal Pembelian,	Nama Anggota,	Pembelian,	jumlah bayar,	metode bayar,	Tanggal pembayaran.
  - sheet  Tagihan Suplier dengan kolom Tanggal transaksi pembelian,	Nama Suplier,	Pembelian,	Jumlah Dibayar,	Metode Bayar,	Tanggal Bayar.
  - sheet cash keluar dengan kolom Tanggal,	Jumlah,	kategori,	keterangan,
  - sheet cash masuk dengan kolom Tanggal,	Jumlah,	kategori,	keterangan,
  - sheet laporan keuangan dengan kolom bulan,	saldo awal bulan,	total pendapatan,	total pengeluaran,	saldo akhir.
- buat 1 proyek google appcript baru. pada google spreadsheet klik menu ekstensi, dan pilih appcript.
- copy file kode.gs yang akan berfungsi sebagai backend dan index.html yang akan berfungsi sebagai frontend aplikasi kedalam proyek
- lakukan deployment sebagai aplikasi web dan aplikasi siap digunakan.
anda dapat melakukan beberapa perubahan pada kode untuk menyesuaikan dengan kebutuhan
