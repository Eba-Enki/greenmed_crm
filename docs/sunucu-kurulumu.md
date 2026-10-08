# Sunucu Kurulumu: Deploy ve PHP/MySQL Veri Bağlantısı

Green Med CRM, **https://crm.greenmed.uk** adresinde yayında. Bu belge sitenin sunucuya nasıl yüklendiğini, verilerin veritabanında nasıl saklandığını ve bu yapının nasıl bakımının yapılacağını anlatır.

## Genel bakış

```
GitHub (main) ──push──► GitHub Actions ──FTP──► cPanel: /home/cromtest/crm.greenmed.uk
                                                     │
Tarayıcı (React uygulaması) ◄──► api/*.php ◄──► MySQL: cromtest_crmgreenmed_uk
```

- `main` branch'ine yapılan her push siteyi **otomatik olarak canlıda günceller**.
- Uygulama verileri MySQL'de tutulur. Tarayıcıdaki localStorage yalnızca çalışma kopyasıdır.

## 1. Deploy (GitHub Actions → FTP)

| Öğe | Değer |
|---|---|
| Workflow dosyası | `.github/workflows/deploy.yml` |
| Tetikleyici | `main`'e push veya Actions sekmesinden elle çalıştırma |
| Protokol | Düz FTP (sunucu FTPS bağlantısını reddetti) |
| Hedef klasör | `./` (FTP hesabı doğrudan `/home/cromtest/crm.greenmed.uk` klasörüne açılır) |
| Sunucu IP | 104.247.160.179 |

**GitHub secret'ları** (repo → Settings → Secrets and variables → Actions):

- `FTP_SERVER`: sunucu adresi
- `FTP_USERNAME`: yalnızca `crm.greenmed.uk` klasörüne erişen FTP hesabı
- `FTP_PASSWORD`: bu hesabın şifresi

**Sunucuya yüklenmeyen dosyalar:** `.github/`, `.claude/`, `.tools/`, `tools/`, `database/`, `docs/`, `CLAUDE.md`, `README.md`, `serve.ps1`, `index_backup_monolith.html`, `api/config.sample.php`

**Derleme adımı:** Upload'dan önce `tools/build.mjs` çalışır. Bu adım `js/` altındaki JSX kodunu, tarayıcının kullandığı Babel sürümü ve ayarlarıyla (7.22.5, `react` + `env`) önceden derler, `index.html`'den Babel'i kaldırır ve her script'e içeriğe göre `?v=` sürüm etiketi verir. Böylece ziyaretçi 2.8 MB'lık Babel'i indirmez ve kod her açılışta yeniden derlenmez. Derleme hata verirse iş akışı durur ve hiçbir dosya yüklenmez. Repo'daki `index.html` derlenmemiş haliyle kalır; yerelde geliştirme eskisi gibi tarayıcıda derlenerek çalışır. Derlenmiş hali yerelde denemek için projenin bir kopyasında `npm ci --prefix tools` ve `node tools/build.mjs .` çalıştırın; asıl klasörde çalıştırmayın, çünkü dosyaların yerine yazar.

Deploy işlemi yalnızca değişen dosyaları yükler. Sunucudaki `.ftp-deploy-sync-state.json` dosyası neyin yüklendiğini takip eder; **bu dosyayı silmeyin**. Silinirse bir sonraki deploy bütün dosyaları baştan yükler.

## 2. Veritabanı

- **Veritabanı ve kullanıcı adı:** `cromtest_crmgreenmed_uk`
- **Şema dosyası:** `database/schema.sql` (phpMyAdmin → Import ile bir kez yüklenir)

| Tablo | İçerik |
|---|---|
| `records` | Her kayıt bir satırdır. Sütunlar: `collection` (kaydın grubu, örn. `ops_sq`), `id`, `data` (kaydın tamamı JSON olarak), `sort_order`, `version` (her kayıtta 1 artar), `updated_at`, `updated_by` |
| `settings` | Tekil değerler: şirket bilgileri, numara sayaçları, alış fiyatları, logo, imza. `is_raw = 1` olan değerler düz metin (base64 görsel), diğerleri JSON'dur. `version` her kayıtta 1 artar. `__schema` satırı veritabanı şema sürümünü tutar. |
| `record_history` | Değişiklik geçmişi: her ekleme, güncelleme ve silme bir satırdır (`action`: `create` / `update` / `delete` / `import`). `data` yeni hali, silmede ise son halidir. Kullanıcı hesapları (şifre hash'leri) buraya yazılmaz. |

**Otomatik şema güncellemesi:** API, eski şemalı bir veritabanına ilk bağlandığında eksik `version` sütunlarını ve `record_history` tablosunu kendisi ekler (`__schema` değeri 2'den küçükse). Deploy sonrası phpMyAdmin'de elle bir şey yapmak gerekmez. Mevcut kayıtlar `version = 1` ile başlar.

## 3. PHP API (`api/` klasörü)

| Dosya | Görevi |
|---|---|
| `_bootstrap.php` | Veritabanı bağlantısı (PDO), oturum ayarları, izin verilen anahtar listeleri |
| `login.php` | `POST {username, password}`: kullanıcıyı `gm_users` kayıtlarına göre doğrular, sunucuda oturum açar ve kullanıcıyı (şifre hash'i olmadan) döner |
| `users.php` | `POST {action}`: kullanıcı ekleme/düzenleme/silme (yalnızca Admin) ve herkesin kendi profilini/şifresini değiştirmesi. Şifreler burada hash'lenir |
| `logout.php` | `POST`: oturumu kapatır |
| `data.php` | `GET`: bütün verileri ve sürüm numaralarını getirir (`gm_users` şifre hash'leri olmadan). `PUT ?key=...`: bir anahtardaki değişiklikleri kaydeder (`gm_users` hariç; ayrıntı için bkz. bölüm 4). `POST`: toplu içe aktarma (yalnızca Admin, `gm_users` hariç, sürüm kontrolü yapmaz) |
| `history.php` | `GET`: değişiklik geçmişi (yalnızca Admin). `?collection=ops_sq&id=...` bir kaydın bütün eski hallerini verileriyle döner; parametresiz son 200 değişikliği listeler |
| `.htaccess` | `config.php` ve `_bootstrap.php` dosyalarına dışarıdan erişimi engeller (403) |
| `config.php` | **Yalnızca sunucuda bulunur.** Git'e girmez, deploy tarafından yüklenmez veya silinmez. |

### `config.php` yapısı

Dosya `/home/cromtest/crm.greenmed.uk/api/config.php` yolunda olmalıdır. Örneği `api/config.sample.php` dosyasındadır.

```php
<?php
return [
    'db_host' => 'localhost',
    'db_name' => 'cromtest_crmgreenmed_uk',
    'db_user' => 'cromtest_crmgreenmed_uk',
    'db_pass' => '...',

    'bootstrap_admin_user' => 'admin',
    'bootstrap_admin_pass' => '...',

    // İsteğe bağlı (bkz. bölüm 5: Yedekleme)
    // 'backup_dir'  => '/home/cromtest/crm_backups',
    // 'backup_keep' => 30,
];
```

- `db_host` her zaman `localhost` olmalıdır, çünkü PHP ve MySQL aynı sunucuda çalışır.
- `bootstrap_admin_*` yalnızca veritabanında **hiç kullanıcı yokken** kullanılır. Bu bilgilerle yapılan ilk giriş admin hesabını oluşturur. Veritabanında en az bir kullanıcı olduğu sürece devreye girmez.

## 4. Uygulama tarafı senkron

Kod: `js/utils.js` (`Sync`, `apiCall`) ve `js/app-shell.js`.

- **Giriş:** Kullanıcı adı ve şifre önce `login.php` ile sunucuda doğrulanır. Bu kullanıcının önceki oturumdan kalan gönderilmemiş değişiklikleri varsa önce onlar gönderilir. Ardından bütün veriler ve sürüm numaraları sunucudan çekilip localStorage'a yazılır.
- **Kaydetme:** Uygulama bir listeyi `LS.set` ile kaydettiğinde, 300 ms sonra yalnızca **değişen kayıtlar** gönderilir (eklenen, güncellenen, silinen). Her kayıt, tarayıcının en son gördüğü sürüm numarasıyla gider. Tarayıcı, sunucunun son onayladığı hali `gm_sync_base` anahtarında tutar (kayıt başına sürüm numarası ve içerik özeti).
- **Çakışma:** Kayıt o arada başka biri tarafından değiştirilmiş veya silinmişse sunucu üzerine yazmaz, kendi halini geri gönderir. Kullanıcı "Updated by another user" penceresini görür, açık portal en güncel veriyle yeniden yüklenir. Diğer kayıtlar etkilenmez: bir kullanıcının ekranında olmayan kayıtlar asla silinmez.
- **Belge numaraları:** `off_i`, `off_q`, `off_p`, `ops_sq`, `ops_si`, `ops_po`, `ops_proj` listelerinde numara (`number`) büyük/küçük harf farkı gözetmeden tekil olmalıdır. Aynı anda iki kişi aynı numarayla yeni belge oluşturursa ikinciye sunucu bir sonraki boş numarayı verir (SQ0011 → SQ0012) ve kullanıcıya bildirir. Diğer belgelerdeki bağlantılar (`linkedPO` gibi) da yeni numaraya güncellenir. Mevcut bir belgenin numarasını başka bir belgenin numarasına çevirmek reddedilir.
- **Sayaçlar:** `off_cnt` / `ops_cnt` aynı anda kaydedilirse birleştirilir (her alanda büyük olan kalır) ve çakışma sayılmaz. Diğer ayarlar (`off_co`, `ops_co`, `ops_pp`, logo, imza) kayıtlar gibi sürüm kontrolüyle kaydedilir.
- **Gönderilemeyen değişiklikler:** Değişen anahtarlar `gm_sync_pending` listesine yazılır ve sunucu kabul edene kadar orada kalır. Bağlantı yoksa 5 saniyeden 1 dakikaya kadar artan aralıklarla, bağlantı geri geldiğinde ise hemen tekrar denenir. Sayfa yenilense veya tarayıcı kapansa bile kaybolmaz; sayfa yeniden açılınca önce bunlar gönderilir. Bekleyen değişiklik varken sunucudan gelen veri bu anahtarların üzerine yazılmaz. Bekleyen değişiklik olduğu sürece ekranın altında kırmızı uyarı ve "Retry now" düğmesi görünür.
- **Kullanıcılar:** `gm_users` yalnızca sunucudan okunur, `data.php` ile yazılmaz. Kullanıcı değişiklikleri `usersApi()` üzerinden `users.php`'ye gider.
- **Sayfa yenileme:** Oturum açıksa önce bekleyen değişiklikler gönderilir, sonra veriler sunucudan tekrar yüklenir. Sunucu oturumu sona ermişse login ekranı açılır. Bekleyen değişiklik yoksa localStorage temizlenir; varsa saklanır ve **aynı kullanıcı** tekrar giriş yapınca gönderilir. Başka bir kullanıcı giriş yaparsa bu değişiklikler atılır.
- **Eski sürüm uyarısı:** Önbellekte eski uygulama kodu kalmış bir tarayıcı kaydetmeye çalışırsa sunucu bunu reddeder (426), kullanıcıdan sayfayı yenilemesini ister ve hiçbir veriyi silmez. `index.html` içindeki `?v=...` ekleri her sürümde değiştirilerek tarayıcıların yeni JS dosyalarını indirmesi sağlanır.
- **Çıkış:** Önce bekleyen değişiklikler gönderilir. Gönderilemeyen değişiklik kalırsa kullanıcıya sorulur ("Log out and discard" / "Stay logged in"). Sonra sunucudaki oturum kapatılır ve senkron edilen veriler tarayıcıdan silinir.

### Senkron edilen anahtarlar

| Grup | Anahtarlar |
|---|---|
| Ortak | `gm_users`, `gm_logo`, `gm_signature` |
| Official portalı | `off_i` (faturalar), `off_q` (teklifler), `off_p` (satın alma siparişleri), `off_r` (gelen faturalar), `off_pr` (projeler), `off_cust` (müşteri/tedarikçi), `off_banktx` (banka hareketleri), `off_expcat`, `off_incomecat` (kategoriler), `off_co` (şirket ve banka hesapları), `off_cnt` (sayaçlar) |
| Sales & Procurement portalı | `ops_sq` (satış teklifleri), `ops_si` (satış faturaları), `ops_pq` (satın alma teklifleri), `ops_po` (satın alma siparişleri), `ops_ri` (gelen faturalar), `ops_proj` (projeler), `ops_cust` (müşteri/tedarikçi), `ops_exp` (masraflar), `ops_expcat` (masraf kategorileri), `ops_docs` (dokümanlar), `ops_co`, `ops_cnt`, `ops_pp` (alış fiyatları) |

**Senkron edilmeyenler** (yalnızca tarayıcıda kalır): `gm_session`, `gm_sync_base`, `gm_sync_pending`, `*_settingsMenu`, eski `off_users` / `ops_users`.

### Yeni bir anahtar eklemek

Uygulamaya kalıcı olması gereken yeni bir veri alanı eklendiğinde, adı **iki yere** yazılmalıdır:

1. `js/utils.js` → `SYNC_JSON_KEYS` (JSON veri) veya `SYNC_RAW_KEYS` (düz metin)
2. `api/_bootstrap.php` → `RECORD_KEYS` (`id`'li kayıtlardan oluşan dizi), `SETTING_KEYS` (tek JSON değer) veya `RAW_KEYS` (düz metin)

Ayar türündeyse (`id`'li kayıt listesi değilse) `js/utils.js` → `SYNC_SETTING_KEYS` listesine de eklenmelidir. Numarası tekil olması gereken bir belge listesiyse `api/_bootstrap.php` → `NUMBERED_KEYS` listesine eklenir.

Yalnızca birine yazılırsa ya veri tarayıcıda kalır ya da sunucu `Unknown key` hatası verir.

### Dil desteği (EN / TR)

- Arayüz metinleri kodda İngilizce yazılır ve `tr('...')` ile sarılır. Türkçeleri `js/i18n.js` → `I18N_TR` sözlüğündedir. Sözlükte olmayan bir metin İngilizce görünür.
- Değişken içeren metinler yer tutucu kullanır: `tr('Delete {0}?', doc.number)` → sözlükte `'{0} silinsin mi?'`.
- Dil seçimi tarayıcıya özeldir (`gm_lang`, sunucuya gitmez). Varsayılan İngilizcedir. Dil değişince sayfa yeniden yüklenir; açık bir formda kaydedilmemiş değişiklik varsa önce sorulur.
- **Belgeler her zaman İngilizcedir:** PDF'ler (`buildStandardPDF`), uygulama içindeki belge önizlemesi (`DocSummaryBody`, `lang="en"`) ve Excel dışa aktarımları çevrilmez. Kayıtlara yazılan değerler (durum anahtarları, roller, varsayılan kategori adları, ödeme koşulları) de çevrilmez; yalnızca ekranda gösterilirken `tr()` ile çevrilir.
- Yeni bir ekran metni eklerken: metni `tr('...')` ile sarın ve Türkçesini `I18N_TR`'ye ekleyin. JS dosyaları değiştiğinde `index.html` içindeki `?v=...` eklerini güncelleyin.

## 5. Yedekleme ve değişiklik geçmişi

### Günlük yedek (cPanel Cron Job)

`cron/backup.php` bütün tabloların sıkıştırılmış SQL dökümünü alır. Varsayılan klasör site klasörünün yanındaki `crm_backups` klasörüdür (`/home/cromtest/crm_backups`), yani web'den erişilemez. Klasör yoksa oluşturulur. En yeni 30 yedek tutulur, daha eskiler silinir. Klasör ve sayı `config.php`'deki `backup_dir` ve `backup_keep` ile değiştirilebilir.

**Kurulum (bir kez):** cPanel → **Cron Jobs** → *Add New Cron Job*:

- Common Settings: **Once Per Day** (örneğin gece 03:00 → Minute `0`, Hour `3`)
- Command:

  ```
  /usr/local/bin/php /home/cromtest/crm.greenmed.uk/cron/backup.php
  ```

  PHP yolu sunucuda farklıysa cPanel'in gösterdiği yolu kullanın. Komutu ilk seferde **Terminal**'de elle çalıştırıp `Backup written: ...` çıktısını görmek iyi olur.

Betik yalnızca komut satırından çalışır: tarayıcıdan açılınca 404 döner, ayrıca `cron/.htaccess` klasöre web erişimini kapatır.

**Geri yükleme:** Yedek dosyasını (`greenmed-crm-YYYY-MM-DD-HHMMSS.sql.gz`) indirin → phpMyAdmin → veritabanını seçin → **Import**. Dosya tabloları silip yedekteki haliyle yeniden oluşturur, yani o andan sonraki bütün değişiklikler gider. Geri yüklemeden önce mevcut durumun da bir yedeğini alın.

### Değişiklik geçmişi

Her kayıt değişikliği `record_history` tablosuna yazılır: kim, ne zaman, hangi işlem ve kaydın o anki tam hali. Silinen bir kaydın son hali de saklanır.

- **Admin olarak görüntüleme:** Uygulamada giriş yapmışken F12 → Console:

  ```js
  await apiCall('history.php')                                   // son 200 değişiklik
  await apiCall('history.php?collection=ops_sq&id=KAYIT_ID')     // bir kaydın bütün halleri
  ```

- **Silinen veya bozulan bir kaydı elle geri getirme:** phpMyAdmin → `record_history` → ilgili satırdaki `data` değeri, kaydın o anki halidir. Şimdilik bunun için bir ekran yok; geri getirme bir geliştirici veya Admin tarafından elle yapılır.
- Geçmiş tablosu silinmez ve zamanla büyür. Dokümanlar (`ops_docs`) base64 olarak durduğundan her doküman değişikliği geçmişte dosyanın tamamını bir kez daha saklar.

## 6. Sıfırdan kurulum (yeni sunucu veya yeniden kurulum)

1. cPanel → **MySQL Databases**: veritabanı ve kullanıcı oluşturun. **Add User To Database** bölümünden kullanıcıya **ALL PRIVILEGES** yetkisi verin.
2. **phpMyAdmin**: soldan veritabanını seçin → **Import** → `database/schema.sql`. Varsayılan ayarlar yeterlidir (utf-8, SQL, NONE).
3. **File Manager**: `api/config.php` dosyasını oluşturun (bkz. yukarıdaki yapı). Dosya `<?php` satırıyla başlamalıdır.
4. GitHub secret'larını kontrol edin ve `main`'e push edin, ya da Actions sekmesinden deploy'u elle çalıştırın.
5. Siteyi açın ve `admin` + `bootstrap_admin_pass` ile ilk girişi yapın.
6. Günlük yedek için cron job'u kurun (bkz. bölüm 5).

## 7. Eski verileri taşıma

Eski sitedeki (tarayıcıda kalan) verileri sunucuya aktarmak için:

**1. Eski sitede** F12 → Console'a yapıştırın. Kod her grubun kayıt sayısını tablo halinde gösterir ve veriyi panoya kopyalar:

```js
const K=['gm_users','gm_logo','gm_signature','off_i','off_q','off_p','off_r','off_pr','off_cust','off_banktx','off_expcat','off_incomecat','off_co','off_cnt','ops_cust','ops_proj','ops_sq','ops_si','ops_pq','ops_po','ops_ri','ops_exp','ops_expcat','ops_docs','ops_co','ops_cnt','ops_pp'];
const d={};K.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)d[k]=k==='gm_logo'||k==='gm_signature'?v:JSON.parse(v);});
console.table(Object.fromEntries(Object.entries(d).map(([k,v])=>[k,Array.isArray(v)?v.length+' kayıt':'ayar'])));copy(JSON.stringify(d));
```

**2. crm.greenmed.uk üzerinde** admin olarak giriş yapın, Console'da `YAPIŞTIR` yerine panodaki veriyi koyarak çalıştırın:

```js
await apiCall('data.php',{method:'POST',body:JSON.stringify({data: YAPIŞTIR })}); location.reload();
```

> İçe aktarma kullanıcı listesini (`gm_users`) değiştirmez. Kullanıcılar System Management ekranından eklenmelidir.

## 8. Bilinen sınırlamalar

- **Aynı anda düzenleme:** Kayıtlar tek tek ve sürüm kontrolüyle kaydedilir (bkz. bölüm 4). Aynı kaydı iki kişi aynı anda değiştirirse ilk kaydeden kazanır; ikincisi uyarılır ve değişikliğini yeniden yapması gerekir. Değişiklikler birleştirilmez. Diğer kullanıcıların değişiklikleri ekrana kendiliğinden gelmez: sayfa yenilenince veya bir çakışma olunca yüklenir.
- **Yetkiler:** Kullanıcı yönetimi ve toplu içe aktarma sunucu tarafında Admin'e kısıtlıdır. Diğer rol ve portal yetkileri yalnızca uygulama içinde kontrol edilir; giriş yapmış her kullanıcı API üzerinden iş verilerini (müşteri, fatura vb.) okuyup yazabilir.
- **Şifre saklama:** Şifreler PHP `password_hash` (bcrypt) ile saklanır ve tarayıcıya hiç gönderilmez. Eski SHA-256 hash'ler kullanıcının ilk girişinde otomatik olarak bcrypt'e çevrilir. Veritabanında düz metin şifre kalmışsa o hesap giriş yapamaz; Admin System Management'tan yeni şifre vermelidir.
- **Düz FTP:** Deploy sırasında FTP şifresi ağda şifrelenmeden gider. Hosting firması FTP'de TLS'i açarsa `deploy.yml` dosyasında `protocol: ftps` yapılmalıdır.
- **Büyük dokümanlar:** `ops_docs` dosyaları base64 olarak saklar. Büyük dosyalar yüklenemiyorsa cPanel → **MultiPHP INI Editor** bölümünden `post_max_size` değeri yükseltilmelidir.

## 9. Sorun giderme

| Belirti | Olası neden |
|---|---|
| Girişte "Server error: Server not configured" | `api/config.php` dosyası yok veya yanlış klasörde |
| Girişte "Server error: Database connection failed" | `config.php`'deki veritabanı adı, kullanıcı adı veya şifre yanlış; ya da kullanıcı veritabanına eklenmemiş |
| Girişte "Server error: Database error" | Tablolar yok; `schema.sql` içe aktarılmamış |
| İlk girişte "Incorrect username or password" | `bootstrap_admin_pass` hâlâ `CHANGE_ME_TOO` ya da şifre farklı yazılmış |
| Ekranın altında "N change(s) could not be saved to the server yet" uyarısı | İnternet bağlantısı veya sunucu hatası. Değişiklikler tarayıcıda saklanır ve otomatik tekrar denenir. Uyarı kaybolana kadar tarayıcı verisini silmeyin ve çıkış yapmayın. |
| "The app was updated. Please reload the page" uyarısı | Tarayıcı eski uygulama kodunu çalıştırıyor. Ctrl+F5 ile sayfayı yenileyip değişikliği tekrar yapın. |
| "Updated by another user" penceresi | Aynı kaydı başka biri sizden hemen önce değiştirdi. Onun hali kaldı; kaydı kontrol edip değişikliği yeniden yapın. |
| Deploy "500 This security scheme is not implemented" | Workflow'da `protocol: ftps` var, ama sunucu desteklemiyor |
| Deploy başarılı ama site değişmedi | FTP hesabının açıldığı klasörü kontrol edin (cPanel → FTP Accounts → Path) |

Sunucu tarafındaki hata ayrıntıları PHP hata loguna yazılır (cPanel → **Errors** veya `api/error_log`).
