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

**Sunucuya yüklenmeyen dosyalar:** `.github/`, `.claude/`, `.tools/`, `database/`, `docs/`, `CLAUDE.md`, `README.md`, `serve.ps1`, `index_backup_monolith.html`, `api/config.sample.php`

Deploy işlemi yalnızca değişen dosyaları yükler. Sunucudaki `.ftp-deploy-sync-state.json` dosyası neyin yüklendiğini takip eder; **bu dosyayı silmeyin**. Silinirse bir sonraki deploy bütün dosyaları baştan yükler.

## 2. Veritabanı

- **Veritabanı ve kullanıcı adı:** `cromtest_crmgreenmed_uk`
- **Şema dosyası:** `database/schema.sql` (phpMyAdmin → Import ile bir kez yüklenir)

| Tablo | İçerik |
|---|---|
| `records` | Her kayıt bir satırdır. Sütunlar: `collection` (kaydın grubu, örn. `ops_sq`), `id`, `data` (kaydın tamamı JSON olarak), `sort_order`, `updated_at`, `updated_by` |
| `settings` | Tekil değerler: şirket bilgileri, numara sayaçları, alış fiyatları, logo, imza. `is_raw = 1` olan değerler düz metin (base64 görsel), diğerleri JSON'dur. |

## 3. PHP API (`api/` klasörü)

| Dosya | Görevi |
|---|---|
| `_bootstrap.php` | Veritabanı bağlantısı (PDO), oturum ayarları, izin verilen anahtar listeleri |
| `login.php` | `POST {username, password}`: kullanıcıyı `gm_users` kayıtlarına göre doğrular, sunucuda oturum açar ve kullanıcıyı (şifre hash'i olmadan) döner |
| `users.php` | `POST {action}`: kullanıcı ekleme/düzenleme/silme (yalnızca Admin) ve herkesin kendi profilini/şifresini değiştirmesi. Şifreler burada hash'lenir |
| `logout.php` | `POST`: oturumu kapatır |
| `data.php` | `GET`: bütün verileri getirir (`gm_users` şifre hash'leri olmadan). `PUT ?key=...`: tek bir anahtarı kaydeder (`gm_users` hariç). `POST`: toplu içe aktarma (yalnızca Admin, `gm_users` hariç) |
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
];
```

- `db_host` her zaman `localhost` olmalıdır, çünkü PHP ve MySQL aynı sunucuda çalışır.
- `bootstrap_admin_*` yalnızca veritabanında **hiç kullanıcı yokken** kullanılır. Bu bilgilerle yapılan ilk giriş admin hesabını oluşturur. Veritabanında en az bir kullanıcı olduğu sürece devreye girmez.

## 4. Uygulama tarafı senkron

Kod: `js/utils.js` (`Sync`, `apiCall`) ve `js/app-shell.js`.

- **Giriş:** Kullanıcı adı ve şifre önce `login.php` ile sunucuda doğrulanır. Ardından bütün veriler sunucudan çekilip localStorage'a yazılır.
- **Kaydetme:** Senkron edilen bir anahtar `LS.set`, `setLogo` veya `setSignature` ile değiştiğinde, değer 300 ms sonra `PUT data.php` ile sunucuya gönderilir.
- **Kullanıcılar:** `gm_users` yalnızca sunucudan okunur, `data.php` ile yazılmaz. Kullanıcı değişiklikleri `usersApi()` üzerinden `users.php`'ye gider.
- **Sayfa yenileme:** Oturum açıksa veriler sunucudan tekrar yüklenir. Sunucu oturumu sona ermişse login ekranı açılır ve localStorage temizlenir.
- **Hata:** Bir kayıt sunucuya yazılamazsa ekranın altında kırmızı bir uyarı çıkar.
- **Çıkış:** Sunucudaki oturum kapatılır ve senkron edilen veriler tarayıcıdan silinir.

### Senkron edilen anahtarlar

| Grup | Anahtarlar |
|---|---|
| Ortak | `gm_users`, `gm_logo`, `gm_signature` |
| Official portalı | `off_i` (faturalar), `off_q` (teklifler), `off_p` (satın alma siparişleri), `off_r` (gelen faturalar), `off_pr` (projeler), `off_cust` (müşteri/tedarikçi), `off_banktx` (banka hareketleri), `off_expcat`, `off_incomecat` (kategoriler), `off_co` (şirket ve banka hesapları), `off_cnt` (sayaçlar) |
| Sales & Procurement portalı | `ops_sq` (satış teklifleri), `ops_si` (satış faturaları), `ops_pq` (satın alma teklifleri), `ops_po` (satın alma siparişleri), `ops_ri` (gelen faturalar), `ops_proj` (projeler), `ops_cust` (müşteri/tedarikçi), `ops_exp` (masraflar), `ops_expcat` (masraf kategorileri), `ops_docs` (dokümanlar), `ops_co`, `ops_cnt`, `ops_pp` (alış fiyatları) |

**Senkron edilmeyenler** (yalnızca tarayıcıda kalır): `gm_session`, `*_settingsMenu`, eski `off_users` / `ops_users`.

### Yeni bir anahtar eklemek

Uygulamaya kalıcı olması gereken yeni bir veri alanı eklendiğinde, adı **iki yere** yazılmalıdır:

1. `js/utils.js` → `SYNC_JSON_KEYS` (JSON veri) veya `SYNC_RAW_KEYS` (düz metin)
2. `api/_bootstrap.php` → `RECORD_KEYS` (`id`'li kayıtlardan oluşan dizi), `SETTING_KEYS` (tek JSON değer) veya `RAW_KEYS` (düz metin)

Yalnızca birine yazılırsa ya veri tarayıcıda kalır ya da sunucu `Unknown key` hatası verir.

## 5. Sıfırdan kurulum (yeni sunucu veya yeniden kurulum)

1. cPanel → **MySQL Databases**: veritabanı ve kullanıcı oluşturun. **Add User To Database** bölümünden kullanıcıya **ALL PRIVILEGES** yetkisi verin.
2. **phpMyAdmin**: soldan veritabanını seçin → **Import** → `database/schema.sql`. Varsayılan ayarlar yeterlidir (utf-8, SQL, NONE).
3. **File Manager**: `api/config.php` dosyasını oluşturun (bkz. yukarıdaki yapı). Dosya `<?php` satırıyla başlamalıdır.
4. GitHub secret'larını kontrol edin ve `main`'e push edin, ya da Actions sekmesinden deploy'u elle çalıştırın.
5. Siteyi açın ve `admin` + `bootstrap_admin_pass` ile ilk girişi yapın.

## 6. Eski verileri taşıma

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

## 7. Bilinen sınırlamalar

- **Aynı anda düzenleme:** Uygulama her seferinde listenin tamamını kaydeder. Aynı listeyi (örneğin müşteriler) iki kişi aynı anda düzenlerse son kaydeden kazanır ve diğerinin değişikliği kaybolabilir.
- **Yetkiler:** Kullanıcı yönetimi ve toplu içe aktarma sunucu tarafında Admin'e kısıtlıdır. Diğer rol ve portal yetkileri yalnızca uygulama içinde kontrol edilir; giriş yapmış her kullanıcı API üzerinden iş verilerini (müşteri, fatura vb.) okuyup yazabilir.
- **Şifre saklama:** Şifreler PHP `password_hash` (bcrypt) ile saklanır ve tarayıcıya hiç gönderilmez. Eski SHA-256 hash'ler kullanıcının ilk girişinde otomatik olarak bcrypt'e çevrilir. Veritabanında düz metin şifre kalmışsa o hesap giriş yapamaz; Admin System Management'tan yeni şifre vermelidir.
- **Düz FTP:** Deploy sırasında FTP şifresi ağda şifrelenmeden gider. Hosting firması FTP'de TLS'i açarsa `deploy.yml` dosyasında `protocol: ftps` yapılmalıdır.
- **Büyük dokümanlar:** `ops_docs` dosyaları base64 olarak saklar. Büyük dosyalar yüklenemiyorsa cPanel → **MultiPHP INI Editor** bölümünden `post_max_size` değeri yükseltilmelidir.

## 8. Sorun giderme

| Belirti | Olası neden |
|---|---|
| Girişte "Server error: Server not configured" | `api/config.php` dosyası yok veya yanlış klasörde |
| Girişte "Server error: Database connection failed" | `config.php`'deki veritabanı adı, kullanıcı adı veya şifre yanlış; ya da kullanıcı veritabanına eklenmemiş |
| Girişte "Server error: Database error" | Tablolar yok; `schema.sql` içe aktarılmamış |
| İlk girişte "Incorrect username or password" | `bootstrap_admin_pass` hâlâ `CHANGE_ME_TOO` ya da şifre farklı yazılmış |
| Ekranın altında "Changes could not be saved" uyarısı | İnternet bağlantısı veya sunucu hatası. Sayfayı yenilemeden önce bağlantıyı kontrol edin. |
| Deploy "500 This security scheme is not implemented" | Workflow'da `protocol: ftps` var, ama sunucu desteklemiyor |
| Deploy başarılı ama site değişmedi | FTP hesabının açıldığı klasörü kontrol edin (cPanel → FTP Accounts → Path) |

Sunucu tarafındaki hata ayrıntıları PHP hata loguna yazılır (cPanel → **Errors** veya `api/error_log`).
