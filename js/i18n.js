// ── Language (EN / TR) ──
// UI text is written in English in the code and wrapped in tr('...'); the Turkish comes from I18N_TR.
// A missing entry falls back to English. {0}, {1}… are filled from tr's extra arguments.
// The choice is kept per browser (gm_lang, not synced) and switching reloads the page — unsent changes
// survive the reload. Documents (PDF, in-app document preview, Excel exports) always stay English.
const LANGS=['en','tr'];
const LANG=(()=>{try{const l=localStorage.getItem('gm_lang');return LANGS.includes(l)?l:'en';}catch{return 'en';}})();
document.documentElement.lang=LANG;

const I18N_TR={
  // Statuses
  'Draft':'Taslak','Sent':'Gönderildi','Approved':'Onaylandı','Locked':'Kilitli','Passive':'Pasif','PO Created':'Sipariş Oluşturuldu',
  'Closed':'Kapalı','Paid':'Ödendi','Partially Paid':'Kısmen Ödendi','Received':'Alındı','Unpaid':'Ödenmedi','Overdue':'Gecikmiş',
  'Cancelled':'İptal Edildi','Pending':'Beklemede','Active':'Aktif','Completed':'Tamamlandı','On Hold':'Askıda','Declined':'Reddedildi',
  'Inactive':'Pasif',

  // Common actions and words
  'Save':'Kaydet','Saving...':'Kaydediliyor...','Cancel':'İptal','Back':'Geri','Edit':'Düzenle','Delete':'Sil','Add':'Ekle','New':'Yeni',
  'Remove':'Kaldır','Replace':'Değiştir','Upload':'Yükle','Download':'İndir','Export':'Dışa Aktar','Export Excel':'Excel\'e Aktar',
  'Close':'Kapat','Done':'Tamam','OK':'Tamam','Yes':'Evet','No':'No','None':'Yok','— None —':'— Yok —','All':'Tümü','Both':'İkisi de',
  'Preview':'Önizleme','PDF':'PDF','JPG':'JPG','GBP':'GBP','Details':'Ayrıntılar','Actions':'İşlemler','Default':'Varsayılan',
  'DEFAULT':'VARSAYILAN','ACTIVE':'AKTİF','Set default':'Varsayılan yap','Set Default':'Varsayılan Yap','Dismiss':'Kapat',
  'Retry now':'Şimdi tekrar dene','Search...':'Ara...','— Select —':'— Seçin —','Unnamed':'Adsız','A record':'Bir kayıt',
  'Deleted':'Silindi','Saved ✓':'Kaydedildi ✓','Saved ✓ — ready for the next one':'Kaydedildi ✓ — sıradaki için hazır',
  'Save Anyway':'Yine de Kaydet','Leave without saving':'Kaydetmeden çık','Yes, Delete':'Evet, Sil','View →':'Görüntüle →',
  'Get started by creating one':'Başlamak için yeni bir kayıt oluşturun','Per page:':'Sayfa başına:','Showing {0}–{1} of {2}':'{2} kayıttan {0}–{1} gösteriliyor',
  'Edit {0}':'{0} Düzenle','New {0}':'Yeni {0}','Save {0}':'{0} Kaydet','Delete {0}?':'{0} silinsin mi?','Delete "{0}"?':'"{0}" silinsin mi?',
  'Delete this {0}?':'Bu {0} silinsin mi?','No {0}s yet':'Henüz {0} yok','{0} (deleted)':'{0} (silinmiş)','from {0}':'{0} kaynaklı',

  // Dialogs and sync messages
  'You have unsaved changes. Leave without saving?':'Kaydedilmemiş değişiklikler var. Kaydetmeden çıkılsın mı?',
  'A {0} named "{1}" already exists. Save anyway?':'"{1}" adında bir {0} zaten var. Yine de kaydedilsin mi?',
  '{0} change(s) could not be saved to the server yet. If you log out now they will be lost. Log out anyway?':'{0} değişiklik henüz sunucuya kaydedilemedi. Şimdi çıkış yaparsanız kaybolacaklar. Yine de çıkış yapılsın mı?',
  'Log out and discard':'Çıkış yap ve sil','Stay logged in':'Oturumda kal',
  '{0} change(s) could not be saved to the server yet ({1}). They are kept on this computer and retried automatically — don\'t clear the browser data or log out until this message disappears.':'{0} değişiklik henüz sunucuya kaydedilemedi ({1}). Bu bilgisayarda saklanıyor ve otomatik olarak tekrar deneniyor — bu mesaj kaybolana kadar tarayıcı verilerini silmeyin ve çıkış yapmayın.',
  'Updated by another user':'Başka bir kullanıcı tarafından güncellendi','The latest data has been loaded.':'En güncel veriler yüklendi.',

  // Login, portals, profile
  'Username and password required':'Kullanıcı adı ve şifre gerekli','Incorrect username or password':'Kullanıcı adı veya şifre hatalı',
  'Server error: ':'Sunucu hatası: ','This account has no portal access':'Bu hesabın hiçbir portala erişimi yok','Login error: ':'Giriş hatası: ',
  'Green Med Ltd':'Green Med Ltd','Sign in to your account':'Hesabınıza giriş yapın','Username':'Kullanıcı Adı','Your username':'Kullanıcı adınız',
  'Password':'Şifre','Your password':'Şifreniz','Signing in...':'Giriş yapılıyor...','Sign In':'Giriş Yap',
  'Official':'Resmi','Finance, invoicing and accounting':'Finans, faturalama ve muhasebe','Sales & Procurement':'Satış ve Satın Alma',
  'Sales, procurement and project management':'Satış, satın alma ve proje yönetimi','System Management':'Sistem Yönetimi',
  'User and system management':'Kullanıcı ve sistem yönetimi','Please select the portal you want to use':'Kullanmak istediğiniz portalı seçin',
  'Enter Portal':'Portala Gir','Profile':'Profil','User':'Kullanıcı','Log Out':'Çıkış Yap','Passwords do not match':'Şifreler eşleşmiyor',
  'Username is required':'Kullanıcı adı gerekli','Save error: ':'Kaydetme hatası: ','First Name':'Ad','Your first name':'Adınız','Last Name':'Soyad',
  'Your last name':'Soyadınız','Email':'E-posta','Your email address':'E-posta adresiniz','New Password':'Yeni Şifre',
  'Leave blank to keep current':'Değiştirmemek için boş bırakın','Confirm Password':'Şifre Tekrar','Confirm password':'Şifreyi tekrar girin',

  // Navigation and screen titles
  'Dashboard':'Gösterge Paneli','Documents':'Belgeler','Invoices':'Faturalar','Quotations':'Teklifler','Purchase Orders':'Satın Alma Siparişleri',
  'Received Invoices':'Gelen Faturalar','Management':'Yönetim','Contacts':'Cariler','Projects':'Projeler','Expenses':'Giderler','Incomes':'Gelirler',
  'Bank':'Banka','Settings':'Ayarlar','Bank Accounts':'Banka Hesapları','Official Records':'Resmi Kayıtlar','Official Account':'Resmi Hesap',
  'Sales':'Satış','Sales Quotations':'Satış Teklifleri','Sales Invoices':'Satış Faturaları','Procurement':'Satın Alma','Received Quotes':'Alınan Teklifler',
  'Project Management':'Proje Yönetimi','Product Pool':'Ürün Havuzu','CRM':'CRM','Customers':'Müşteriler','Suppliers':'Tedarikçiler',
  'Sales Quotes':'Satış Teklifleri','Purchase Quotes':'Satın Alma Teklifleri','Expense Categories':'Gider Kategorileri','Categories':'Kategoriler',
  'Back to Dashboard':'Gösterge Paneline Dön',

  // Document types
  'Invoice':'Fatura','Purchase Order':'Satın Alma Siparişi','Received Invoice':'Gelen Fatura','Quotation':'Teklif','Sales Invoice':'Satış Faturası',
  'Sales Quotation':'Satış Teklifi','Received Quote':'Alınan Teklif','Document':'Belge','purchase order':'satın alma siparişi',
  'New Invoice':'Yeni Fatura','New Quotation':'Yeni Teklif','New Purchase Order':'Yeni Satın Alma Siparişi','New Received Invoice':'Yeni Gelen Fatura',
  'New Received Quote':'Yeni Alınan Teklif','New Contact':'Yeni Cari','New Project':'Yeni Proje','New Expense':'Yeni Gider','New Income':'Yeni Gelir',
  'New Account':'Yeni Hesap','POs':'Siparişler',

  // Document forms
  'Enter a document number.':'Bir belge numarası girin.',
  'Number "{0}" is already used by another {1}. Enter a different number.':'"{0}" numarası başka bir {1} tarafından kullanılıyor. Farklı bir numara girin.',
  'Document Details':'Belge Bilgileri','Type the document number':'Belge numarasını yazın','Date':'Tarih','Due Date':'Vade Tarihi',
  'Valid Until':'Geçerlilik Tarihi','Currency':'Para Birimi','Terms':'Ödeme Koşulları','Status':'Durum','Project':'Proje',
  'Vendor / Supplier':'Satıcı / Tedarikçi','Bill To':'Fatura Adresi','— Quick fill from {0} —':'— {0} listesinden hızlı doldur —','— Quick fill —':'— Hızlı doldur —',
  'Supplier Name':'Tedarikçi Adı','Supplier':'Tedarikçi','Customer Name':'Müşteri Adı','Customer':'Müşteri','Address':'Adres','Address...':'Adres...',
  'Reference':'Referans','Ref/PO No':'Ref/Sipariş No','Line Items':'Kalemler','Notes':'Notlar','Notes...':'Notlar...',
  'supplier':'tedarikçi','customer':'müşteri','Search {0} or ref...':'Ara: {0} veya referans...','All Statuses':'Tüm Durumlar',
  'From':'Başlangıç','To':'Bitiş','Amount':'Tutar','Number':'Numara','Type':'Tür','Due':'Vade','Total':'Toplam','Outstanding':'Kalan',
  'Item':'Ürün Kodu','Qty':'Miktar','Unit':'Birim','Unit Price':'Birim Fiyat','Brand':'Marka','Model':'Model','Description':'Açıklama',
  'Item code...':'Ürün kodu...','Description...':'Açıklama...','Brand...':'Marka...','Model...':'Model...','Category...':'Kategori...','Product...':'Ürün...',
  'Add Line':'Satır Ekle','Columns:':'Sütunlar:','Configure Items':'Kalemleri Yapılandır','Download Template':'Şablonu İndir',
  'Import Excel/CSV':'Excel/CSV İçe Aktar','Import Excel':'Excel İçe Aktar','Add Ship To':'Teslimat Adresi Ekle','Ship To':'Teslimat Adresi',
  'Remove Ship To':'Teslimat Adresini Kaldır','Add Signature to PDF':'PDF\'e İmza Ekle','Save PDF':'PDF Kaydet','Download PDF':'PDF İndir',
  'Bank Account (PDF)':'Banka Hesabı (PDF)',

  // Contacts and statements
  'Automatic numbering on':'Otomatik numaralandırma açık','Automatic numbering off — type numbers by hand':'Otomatik numaralandırma kapalı — numaraları elle yazın',
  'Settled':'Kapandı','{0} owes us':'{0} bize borçlu','We owe ':'Bizim borcumuz: ','Export Statement':'Ekstreyi Dışa Aktar','Edit Contact':'Cariyi Düzenle',
  'No invoices or payments yet':'Henüz fatura veya ödeme yok',
  'Invoices in this name and bank transactions with this contact appear here':'Bu isimdeki faturalar ve bu cari ile yapılan banka hareketleri burada görünür',
  'Open Documents':'Açık Belgeler',' · overdue':' · gecikmiş','Statement ({0})':'Hesap Ekstresi ({0})',
  'Debit = owed to us · Credit = owed by us or paid to us':'Borç = bize borçlu olunan · Alacak = bizim borcumuz veya bize ödenen',
  'Debit':'Borç','Credit':'Alacak','Balance':'Bakiye','All relationships':'Tüm ilişki türleri','No contacts match':'Eşleşen cari yok',
  'No contacts yet':'Henüz cari yok','Company':'Firma','Contact':'İlgili Kişi','Phone':'Telefon','Receivable':'Alacak','Payable':'Borç',
  'Statement':'Hesap Ekstresi','Contact Info':'Cari Bilgileri','Company / Name *':'Firma / Ad *','Acme Ltd':'Örnek Ltd','Contact Person':'İlgili Kişi',
  'John Smith':'Ahmet Yılmaz','Relationship':'İlişki Türü','Name':'Ad','Client':'Müşteri','Start':'Başlangıç',

  // Projects
  'No projects yet':'Henüz proje yok','Edit Project':'Projeyi Düzenle','Project Details':'Proje Bilgileri','Project name':'Proje adı',
  'Start Date':'Başlangıç Tarihi','Client: {0}':'Müşteri: {0}','{0} invoices · £{1}':'{0} fatura · £{1}','{0} POs':'{0} sipariş',
  '{0} expenses':'{0} gider','Revenue':'Gelir','{0} invoices':'{0} fatura','PO Costs':'Sipariş Maliyetleri','{0} orders':'{0} sipariş',
  '{0} items':'{0} kalem','Net':'Net','revenue - costs':'gelir - maliyet','Project No':'Proje No','Project Name':'Proje Adı',
  '— Select customer —':'— Müşteri seçin —','Budget':'Bütçe','Budget Currency':'Bütçe Para Birimi',

  // Categories
  'Expense':'Gider','Income':'Gelir','No {0} categories yet':'Henüz {0} kategorisi yok','Code':'Kod','Edit Main Category':'Ana Kategoriyi Düzenle',
  'Edit Sub-Category':'Alt Kategoriyi Düzenle','Main Category':'Ana Kategori','— Choose a Main Category —':'— Ana kategori seçin —',
  '+ Add New Main Category':'+ Yeni Ana Kategori Ekle','New Main Category':'Yeni Ana Kategori','Sub-Category':'Alt Kategori','e.g. AR.01':'örn. AR.01',
  'Delete this category and its sub-categories?':'Bu kategori ve alt kategorileri silinsin mi?','Category':'Kategori',

  // Official settings
  'Please select an image file':'Lütfen bir görsel dosyası seçin','Company Information':'Firma Bilgileri','PDF Templates':'PDF Şablonları',
  'Document Numbering':'Belge Numaralandırma','Bank Details':'Banka Bilgileri','Company Name':'Firma Adı','Company Name *':'Firma Adı *',
  'Company Logo':'Firma Logosu','Signature':'İmza','Please select a PNG or JPG file':'Lütfen PNG veya JPG dosyası seçin',
  'Select a template for your invoices and quotations':'Fatura ve teklifleriniz için bir şablon seçin',
  'Select a template for your invoices and quotations.':'Fatura ve teklifleriniz için bir şablon seçin.',
  'on':'açık','off':'kapalı','Automatic numbering {0}':'Otomatik numaralandırma {0}',
  'New quotations, invoices and purchase orders get the next number from the prefixes below.':'Yeni teklif, fatura ve satın alma siparişleri aşağıdaki öneklerle sıradaki numarayı alır.',
  'Numbers are typed by hand on each quotation, invoice and purchase order — use this to enter old documents. The counters stay where they are; turn this back on to continue automatically.':'Her teklif, fatura ve satın alma siparişinde numara elle yazılır — eski belgeleri girmek için kullanın. Sayaçlar olduğu yerde kalır; otomatik devam etmek için tekrar açın.',
  'Prefix':'Önek','Start Number':'Başlangıç Numarası','Next Number':'Sıradaki Numara','Numbering':'Numaralandırma',

  // Bank accounts and transactions
  'Add Bank':'Banka Ekle','No Bank Accounts':'Banka Hesabı Yok','Add your first bank account to start.':'Başlamak için ilk banka hesabınızı ekleyin.',
  'Unnamed Account':'Adsız Hesap','Account Number:':'Hesap Numarası:','IBAN:':'IBAN:','BIC:':'BIC:','Currency:':'Para Birimi:',
  'Opening Balance:':'Açılış Bakiyesi:','Edit Bank Account':'Banka Hesabını Düzenle','New Bank Account':'Yeni Banka Hesabı','Account Name':'Hesap Adı',
  'Account Number':'Hesap Numarası','BIC':'BIC','IBAN':'IBAN','SWIFT/BIC':'SWIFT/BIC','Opening Balance':'Açılış Bakiyesi',
  'Opening Balance Date':'Açılış Bakiyesi Tarihi','Set as default bank account':'Varsayılan banka hesabı yap','No bank accounts yet':'Henüz banka hesabı yok',
  'Add a bank account to start tracking transactions':'Hareketleri takip etmeye başlamak için bir banka hesabı ekleyin','No account number':'Hesap numarası yok',
  'Bank Account':'Banka Hesabı','Bank Name':'Banka Adı','Bank Address':'Banka Adresi','e.g. Barclays Bank UK PLC':'örn. Barclays Bank UK PLC',
  'No bank accounts':'Banka hesabı yok','Add your first bank account to show it on invoices.':'Faturalarda göstermek için ilk banka hesabınızı ekleyin.',
  'Bank account saved':'Banka hesabı kaydedildi','Delete this bank account?':'Bu banka hesabı silinsin mi?',
  'Delete this bank account? Its transactions will also be deleted.':'Bu banka hesabı silinsin mi? Hesabın hareketleri de silinecek.',
  'Current: {0}{1}':'Güncel: {0}{1}','Exchange':'Döviz Çevir','New Transaction':'Yeni Hareket','Search description, reference...':'Açıklama, referans ara...',
  'Search description, reference, account...':'Açıklama, referans, hesap ara...','In: {0}{1} · Out: {2}{3}':'Giriş: {0}{1} · Çıkış: {2}{3}',
  'In':'Giriş','Out':'Çıkış','FX':'Döviz','Account':'Hesap','Linked':'Bağlı','No transactions yet':'Henüz hareket yok',
  'Delete this currency exchange? It is removed from both accounts.':'Bu döviz çevirme işlemi silinsin mi? İki hesaptan da kaldırılır.',
  'Delete this payment? Its fee row is removed too.':'Bu ödeme silinsin mi? Masraf satırı da kaldırılır.','Delete this transaction?':'Bu hareket silinsin mi?',
  'Exchange saved':'Döviz çevirme kaydedildi','Enter a valid date.':'Geçerli bir tarih girin.','Enter an amount.':'Bir tutar girin.',
  'came from':'kimden geldiğini','went to':'kime gittiğini','Select who the money {0}.':'Paranın {0} seçin.',
  'Select an expense category.':'Bir gider kategorisi seçin.',
  'Enter the amount in {0} and the FX rate (fee cannot be negative).':'{0} cinsinden tutarı ve döviz kurunu girin (masraf negatif olamaz).',
  'Select an expense category for the fee.':'Masraf için bir gider kategorisi seçin.',
  'Amount for {0} must be between 0 and its outstanding {1}.':'{0} için tutar 0 ile kalan {1} arasında olmalı.',
  'The invoices total {0}, more than the payment of {1}.':'Faturaların toplamı {0}, ödeme tutarı olan {1} değerinden fazla.',
  'This transaction is dated before the account\'s Opening Balance date ({0}). Pick a later date.':'Bu hareketin tarihi, hesabın açılış bakiyesi tarihinden ({0}) önce. Daha sonraki bir tarih seçin.',
  'Edit Transaction':'Hareketi Düzenle','Transaction type':'Hareket türü','Out of':'Hesaptan Çıkan','Into':'Hesaba Giren',
  'Amount {0} Account ({1})':'{0} Tutar ({1})','Amount ({0})':'Tutar ({0})','Ref No':'Ref No','Received From *':'Gönderen *','Paid To *':'Ödenen *',
  'Payee (optional)':'Alıcı (isteğe bağlı)','— Select contact —':'— Cari seçin —',
  'Add contacts with the Expense relationship under Contacts.':'Cariler bölümünden Gider ilişki türünde cari ekleyin.',
  'No contacts yet. Add them under Contacts.':'Henüz cari yok. Cariler bölümünden ekleyin.','Expense Category *':'Gider Kategorisi *',
  '{0} Category (optional)':'{0} Kategorisi (isteğe bağlı)','Payment Currency':'Ödeme Para Birimi',' (account)':' (hesap)',
  'FX Rate (1 {0} = ? {1})':'Döviz Kuru (1 {0} = ? {1})','Fee ({0})':'Masraf ({0})',' {0} {1} fee':' {0} {1} masraf',
  'out of the account':'hesaptan çıkar','into the account':'hesaba girer',
  '· the amount above differs — check it against the statement':'· yukarıdaki tutar farklı — banka ekstresiyle karşılaştırın',
  'Fee Expense Category':'Masraf Gider Kategorisi','The fee is booked as a separate expense row.':'Masraf ayrı bir gider satırı olarak kaydedilir.',
  'Invoices settled by this payment':'Bu ödemeyle kapanan faturalar','Received invoices settled by this payment':'Bu ödemeyle kapanan gelen faturalar',
  '(optional · {0})':'(isteğe bağlı · {0})','invoices':'fatura','received invoices':'gelen fatura',
  'No open {0} in {1} for this contact.':'Bu cari için {1} cinsinden açık {0} yok.','This payment':'Bu ödeme','Settle ':'Kapat: ',
  'Allocated':'Dağıtılan','of':'/',' — more than the payment':' — ödemeden fazla',' · {0} on account':' · {0} hesapta kalır',
  'What was this for?':'Bu ne için yapıldı?','Select both accounts.':'İki hesabı da seçin.','Choose two different accounts.':'İki farklı hesap seçin.',
  'Enter the amount out, FX rate and amount in (fee cannot be negative).':'Çıkan tutarı, döviz kurunu ve giren tutarı girin (masraf negatif olamaz).',
  'This exchange is dated before the Opening Balance date of {0} ({1}). Pick a later date.':'Bu döviz çevirmenin tarihi, {0} hesabının açılış bakiyesi tarihinden ({1}) önce. Daha sonraki bir tarih seçin.',
  'Edit Currency Exchange':'Döviz Çevirmeyi Düzenle','Currency Exchange':'Döviz Çevirme','Accounts':'Hesaplar',
  'From Account (money out)':'Kaynak Hesap (para çıkışı)',' — lower than the amount out':' — çıkan tutardan düşük','Balance: {0}{1}{2}':'Bakiye: {0}{1}{2}',
  'Swap accounts':'Hesapları değiştir','To Account (money in)':'Hedef Hesap (para girişi)','Statement reference':'Ekstre referansı',
  'Amounts (as on the bank statement)':'Tutarlar (banka ekstresindeki gibi)','Amount Out ({0})':'Çıkan Tutar ({0})','Amount In ({0})':'Giren Tutar ({0})',
  ' − {0}{1} fee':' − {0}{1} masraf','· Amount In differs from this — check it against the statement':'· Giren tutar bundan farklı — banka ekstresiyle karşılaştırın',
  'The fee is booked as a separate expense: {0}{1} in, {2}{3} fee out.':'Masraf ayrı bir gider olarak kaydedilir: {0}{1} giriş, {2}{3} masraf çıkışı.',
  'Description (optional)':'Açıklama (isteğe bağlı)','e.g. Supplier payment funding':'örn. Tedarikçi ödemesi için fon',

  // Sales quotations and invoices
  'New revision created':'Yeni revizyon oluşturuldu','Quote unlocked':'Teklifin kilidi açıldı','Quote marked as sent':'Teklif gönderildi olarak işaretlendi',
  'Invoice marked as sent':'Fatura gönderildi olarak işaretlendi','Quote approved & locked':'Teklif onaylandı ve kilitlendi','Invoice saved':'Fatura kaydedildi',
  'Converted to PO':'Siparişe dönüştürüldü','Search customer, quote no...':'Müşteri, teklif no ara...','No quotations yet':'Henüz teklif yok',
  'Quote No':'Teklif No','{0} rev':'{0} revizyon','Mark as Sent':'Gönderildi Olarak İşaretle','Approve':'Onayla','Revise':'Revize Et',
  'Create Invoice':'Fatura Oluştur','Delete this quotation?':'Bu teklif silinsin mi?','No data found in file':'Dosyada veri bulunamadı',
  'Could not find a "Description" column in the first row. Use "Download Template" to get the expected headers.':'İlk satırda "Description" sütunu bulunamadı. Beklenen başlıklar için "Şablonu İndir"i kullanın.',
  'No valid items found':'Geçerli kalem bulunamadı','Import error: ':'İçe aktarma hatası: ','Failed to read file':'Dosya okunamadı',
  'Edit Quotation':'Teklifi Düzenle','Revision {0}':'Revizyon {0}','Save Quotation':'Teklifi Kaydet','Quotation Details':'Teklif Bilgileri',
  'Duplicate item (same description)':'Tekrarlanan kalem (aynı açıklama)','Previously quoted — see price history below':'Daha önce teklif edildi — aşağıdaki fiyat geçmişine bakın',
  'This item was previously used:':'Bu kalem daha önce kullanıldı:','Use £{0}':'£{0} kullan',
  'This quotation is locked. To make changes, click "New Revision" from the list.':'Bu teklif kilitli. Değişiklik yapmak için listeden "Revize Et"e tıklayın.',
  '{0} Sales Invoice —':'{0} Satış Faturası —','Save Invoice':'Faturayı Kaydet','From Quotation:':'Kaynak Teklif:','Invoice Details':'Fatura Bilgileri',
  'Invoice No':'Fatura No','Invoice Date':'Fatura Tarihi','Line Items (from Quotation)':'Kalemler (tekliften)','Available Qty':'Kalan Miktar',
  'Invoice Qty':'Fatura Miktarı','Search customer or invoice no...':'Müşteri veya fatura no ara...','No sales invoices yet':'Henüz satış faturası yok',
  'Approve a quotation and convert it to invoice':'Bir teklifi onaylayıp faturaya dönüştürün','From Quote':'Kaynak Teklif',
  'This invoice has been marked as sent. Edit anyway?':'Bu fatura gönderildi olarak işaretlendi. Yine de düzenlensin mi?','Delete this invoice?':'Bu fatura silinsin mi?',

  // Procurement
  'Search supplier or ref...':'Tedarikçi veya referans ara...','Linked To':'Bağlı Olduğu','Linked From':'Kaynağı',
  'Convert to Purchase Order':'Satın Alma Siparişine Dönüştür','Create Received Invoice':'Gelen Fatura Oluştur','Mark as Paid':'Ödendi Olarak İşaretle',
  'Marked as paid':'Ödendi olarak işaretlendi','From Purchase Quotation:':'Kaynak Satın Alma Teklifi:','From Purchase Order:':'Kaynak Satın Alma Siparişi:',
  'Their PQ No':'Tedarikçi Teklif No','PO No':'Sipariş No','Their Invoice No':'Tedarikçi Fatura No','Delivery Date':'Teslim Tarihi',

  // Product pool
  'Purchase price saved ✓':'Alış fiyatı kaydedildi ✓','Search item, customer, project...':'Ürün, müşteri, proje ara...',
  'All items from Sent quotations appear automatically. Amber rows = same item quoted to same customer more than once.':'Gönderilen tekliflerdeki tüm kalemler otomatik görünür. Turuncu satırlar = aynı müşteriye aynı ürün birden fazla kez teklif edilmiş.',
  'Pool is empty':'Havuz boş','Mark quotations as Sent to populate the pool':'Havuzu doldurmak için teklifleri Gönderildi olarak işaretleyin',
  'Sale Price':'Satış Fiyatı','Purchase Price':'Alış Fiyatı','Set Purchase Price':'Alış Fiyatı Gir','{0} · {1} · Sale: £{2}':'{0} · {1} · Satış: £{2}',
  'Purchase Price (£)':'Alış Fiyatı (£)','Save Price':'Fiyatı Kaydet',

  // Expenses
  'All Categories':'Tüm Kategoriler','All Projects':'Tüm Projeler','Total: £{0}':'Toplam: £{0}','No expenses yet':'Henüz gider yok','Employee':'Çalışan',
  'Delete this expense?':'Bu gider silinsin mi?',
  'Could not find Amount/Description columns in the first row. Use "Download Template" to get the expected headers.':'İlk satırda Amount/Description sütunları bulunamadı. Beklenen başlıklar için "Şablonu İndir"i kullanın.',
  'No valid rows found':'Geçerli satır bulunamadı',
  '{0} selected row(s) have a missing/invalid amount. Fix or uncheck them first.':'Seçili {0} satırda tutar eksik veya geçersiz. Önce düzeltin veya seçimi kaldırın.',
  '✓ {0} expenses imported':'✓ {0} gider içe aktarıldı','Import Expenses':'Giderleri İçe Aktar','Choose File':'Dosya Seç','No file selected yet':'Henüz dosya seçilmedi',
  'Download the template, fill it in, then choose the file to preview before importing.':'Şablonu indirin, doldurun, sonra içe aktarmadan önce önizlemek için dosyayı seçin.',
  '{0} rows parsed':'{0} satır okundu','{0} selected to import':'{0} satır içe aktarılmak üzere seçili',
  '· {0} possible duplicate(s) unchecked automatically':'· olası {0} tekrar kaydın seçimi otomatik kaldırıldı','Ccy':'PB',
  'Looks like it might already exist in Expenses':'Giderlerde zaten var gibi görünüyor','Import {0} Expense{1}':'{0} Gideri İçe Aktar',
  'New category...':'Yeni kategori...','Amount is required':'Tutar gerekli','Edit Expense':'Gideri Düzenle','Expense Details':'Gider Bilgileri','Receipt No':'Fiş No',

  // Customers and documents (Sales & Procurement)
  'Customer & Supplier':'Müşteri ve Tedarikçi','No customers yet':'Henüz müşteri yok','Edit Customer':'Müşteriyi Düzenle','New Customer':'Yeni Müşteri',
  'Customer Info':'Müşteri Bilgileri','No documents yet':'Henüz doküman yok','Upload your first document to get started':'Başlamak için ilk dokümanınızı yükleyin',
  'Upload Date':'Yükleme Tarihi','Document Name':'Doküman Adı','Edit Document':'Dokümanı Düzenle','Upload Document':'Doküman Yükle',
  'Document saved':'Doküman kaydedildi','Please select a PDF or JPG file':'Lütfen PDF veya JPG dosyası seçin','Enter document name...':'Doküman adını girin...',
  'e.g. Legal, Financial, HR...':'örn. Hukuk, Finans, İK...','Upload File (PDF or JPG)':'Dosya Yükle (PDF veya JPG)','✓ File uploaded ({0})':'✓ Dosya yüklendi ({0})',

  // Sales & Procurement settings and dashboard
  'No {0} uploaded':'{0} yüklenmedi','Branding':'Marka Görselleri','Logo':'Logo',
  'PNG, JPG or SVG. Shown in the sidebar and on documents. Saved immediately.':'PNG, JPG veya SVG. Kenar çubuğunda ve belgelerde görünür. Hemen kaydedilir.',
  'PNG or JPG, ideally with a transparent background. Saved immediately.':'PNG veya JPG, tercihen şeffaf arka planlı. Hemen kaydedilir.',
  '{0} approved':'{0} onaylı','{0} draft':'{0} taslak','{0} active':'{0} aktif','{0} sent':'{0} gönderildi','{0} pending':'{0} bekliyor',

  // System management
  'A user named "{0}" already exists. Usernames must be unique (case doesn\'t matter).':'"{0}" adında bir kullanıcı zaten var. Kullanıcı adları benzersiz olmalı (büyük/küçük harf fark etmez).',
  'Edit User':'Kullanıcıyı Düzenle','New User':'Yeni Kullanıcı','User Information':'Kullanıcı Bilgileri','First name':'Ad','Last name':'Soyad',
  'Portal Permissions':'Portal Yetkileri','If "No Access" is selected, the user cannot access that portal.':'"Erişim Yok" seçilirse kullanıcı o portala giremez.',
  '— No Access —':'— Erişim Yok —','No Access':'Erişim Yok','User saved':'Kullanıcı kaydedildi','Users':'Kullanıcılar',
  'Access and permissions for all portals':'Tüm portallar için erişim ve yetkiler','No users yet':'Henüz kullanıcı yok',
  'Do you want to delete user "{0}"?':'"{0}" kullanıcısı silinsin mi?','User deleted':'Kullanıcı silindi',
  'Manager':'Yönetici','Admin':'Admin',

  // Language switch
  'Language':'Dil',
  'Loading':'Yükleniyor','Search everything':'Her şeyi ara','No matches':'Eşleşme yok',
  'A required component could not be loaded. Check your internet connection and try again.':'Gerekli bir bileşen yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.',

  // Added after the screen walkthrough
  'Sales & Procurement Account':'Satış ve Satın Alma Hesabı','Save & New':'Kaydet ve Yeni','items':'kalem','contacts':'kayıt',
  'Customer & Supplier':'Müşteri ve Tedarikçi','Owner':'Sahip','Official — Finance & Accounting':'Resmi — Finans ve Muhasebe',
  'Official settings were changed by another user at the same time. Their version was kept — please check and make your change again.':'Resmi portal ayarları aynı anda başka bir kullanıcı tarafından değiştirildi. Onun hali korundu — lütfen kontrol edip değişikliğinizi tekrar yapın.',
  'Sales & Procurement settings were changed by another user at the same time. Their version was kept — please check and make your change again.':'Satış ve Satın Alma ayarları aynı anda başka bir kullanıcı tarafından değiştirildi. Onun hali korundu — lütfen kontrol edip değişikliğinizi tekrar yapın.',
  'The logo or signature was changed by another user at the same time. Their version was kept — please check and make your change again.':'Logo veya imza aynı anda başka bir kullanıcı tarafından değiştirildi. Onun hali korundu — lütfen kontrol edip değişikliğinizi tekrar yapın.',
  'Number {0} was taken by another user at the same moment, so your document was saved as {1}.':'{0} numarası aynı anda başka bir kullanıcı tarafından alındı, bu yüzden belgeniz {1} numarasıyla kaydedildi.',
  '{0} was deleted by another user, so your changes to it were not saved.':'{0} başka bir kullanıcı tarafından silindi, bu yüzden değişiklikleriniz kaydedilmedi.',
  '{0} was changed by another user at the same time. Their version was kept — please check it and make your change again.':'{0} aynı anda başka bir kullanıcı tarafından değiştirildi. Onun hali korundu — lütfen kontrol edip değişikliğinizi tekrar yapın.',
  '{0} could not be saved: {1}':'{0} kaydedilemedi: {1}',
  'No {0} account — {1} ({2}) will be used':'{0} hesabı yok — {1} ({2}) kullanılacak','No bank accounts in Settings':'Ayarlarda banka hesabı yok',
  'Money In':'Para Girişi','Money Out':'Para Çıkışı',
  'Number {0} is already used by another document.':'{0} numarası başka bir belgede kullanılıyor.',
  'Revision {0} was already created by another user.':'{0} revizyonu başka bir kullanıcı tarafından zaten oluşturuldu.',
};

const tr=(s,...a)=>{
  const r=LANG==='tr'&&Object.prototype.hasOwnProperty.call(I18N_TR,s)?I18N_TR[s]:s;
  return a.length?r.replace(/\{(\d+)\}/g,(m,i)=>a[i]==null?'':String(a[i])):r;
};
// Remembers the choice and reloads; the caller is responsible for asking about unsaved form changes first.
const setLang=l=>{
  if(l===LANG||!LANGS.includes(l))return;
  try{localStorage.setItem('gm_lang',l);}catch{}
  location.reload();
};
