export const OCR_EXTRACTION_PROMPT = `
Belgedeki tüm okunabilir metni çıkar.

Kurallar:
- Yalnızca belgede açıkça görülen bilgileri kullan.
- Tahmin üretme.
- Eksik bilgileri uydurma.
- Tarihleri mümkünse YYYY-MM-DD formatına dönüştür.
- Alan bulunamazsa boş bırak.

Özellikle şu alanları ara:
- ad
- soyad
- doğum tarihi
- uyruk
- pasaport numarası
- geçerlilik tarihi
- adres
- belge numarası
`.trim();

export const DOCUMENT_ANALYSIS_PROMPT = `
Belgeyi analiz et ve kullanıcının süreci açısından önemli bilgileri çıkar.

Şunları kontrol et:
- belge türü
- belgenin geçerli olup olmadığı
- son geçerlilik tarihi
- eksik veya okunamayan alanlar
- kullanıcının işlem yapmasını gerektiren durumlar
- olası riskler

Kesin olmayan bilgileri kesinmiş gibi yazma.
Yanıtı kısa, açık ve uygulanabilir biçimde hazırla.
`.trim();

export const DOCUMENT_COMPARISON_PROMPT = `
Belgelerde bulunan ortak alanları karşılaştır.

Özellikle şu alanları kontrol et:
- ad
- soyad
- doğum tarihi
- adres
- pasaport numarası
- uyruk
- belge numarası
- geçerlilik tarihi

Kurallar:
- Büyük ve küçük harf farklarını tek başına uyuşmazlık sayma.
- Gereksiz boşlukları göz ardı et.
- Gerçek bir farklılık varsa açıkça belirt.
- Her uyuşmazlıkta hangi belgelerde hangi değerlerin bulunduğunu yaz.
- Tahmin üretme.
`.trim();

export const SMART_FORM_PROMPT = `
Çıkarılmış belge bilgilerini verilen form alanlarıyla eşleştir.

Kurallar:
- Yalnızca güçlü ve açık eşleşmeleri öner.
- Form alanını tahmin ederek doldurma.
- Güven düşükse kullanıcı kontrolü gerektiğini belirt.
- Belgedeki değeri değiştirme.
- Her öneride kaynak belgeyi belirt.
`.trim();

export const RECOMMENDATION_PROMPT = `
Kullanıcının süreçlerini, belgelerini, hedef tarihlerini ve hazırlık puanını analiz et.

Öneriler:
- kısa
- açık
- uygulanabilir
- öncelik sırasına göre
olmalıdır.

Kritik durumları önce göster.

Hukuki kesinlik iddiasında bulunma.
Gerektiğinde güncel resmi kurum bilgisinin kontrol edilmesini öner.
`.trim();

export const CHAT_SYSTEM_PROMPT = `
Sen ALQEV uygulamasının kişisel süreç asistanısın.

Görevin:
- kullanıcının aktif süreçlerini anlamak
- eksik belgeleri dikkate almak
- yaklaşan tarihleri dikkate almak
- hazırlık puanını dikkate almak
- kullanıcıya sıradaki en mantıklı adımı söylemek

Kurallar:
- kısa ve net cevap ver
- gereksiz genel bilgi verme
- kullanıcının verilerinde olmayan bilgileri uydurma
- emin olmadığın hukuki konularda kesin konuşma
- gerektiğinde resmi kaynakların kontrol edilmesini öner
`.trim();