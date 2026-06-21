/* OGX 공용 메뉴 표시 제어
 * 관리자(worship-team 관리자 패널)가 app_settings.hidden_menus 에 넣은 메뉴를
 * 모든 페이지의 상단 네비 + 허브 카드에서 숨긴다. (공개 read — 로그인 불필요)
 * 테이블/네트워크 문제 시 아무것도 숨기지 않음(전체 표시) → 페이지는 항상 정상 동작.
 */
(function () {
  var SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg'; // 공개(client-safe) 키
  var KEYS = ['recommend', 'sheet-finder', 'praise-ppt', 'worship-team', 'accompaniment', 'pads'];
  var LS = 'ogx:hiddenMenus';

  // keys 배열에 해당하는 네비 링크/허브 카드를 숨김. 이전에 숨긴 것은 먼저 복원(토글 해제 반영).
  function apply(keys) {
    if (!Array.isArray(keys)) keys = [];
    // 복원
    var prev = document.querySelectorAll('[data-ogx-hidden]');
    for (var i = 0; i < prev.length; i++) {
      prev[i].style.display = '';
      prev[i].removeAttribute('data-ogx-hidden');
    }
    // 숨김
    keys.forEach(function (k) {
      if (KEYS.indexOf(k) < 0) return;
      var re = new RegExp('(^|/)' + k + '(\\.html)?($|[?#])');
      var links = document.querySelectorAll('a[href*="' + k + '"]');
      for (var j = 0; j < links.length; j++) {
        var href = links[j].getAttribute('href') || '';
        if (re.test(href)) {
          links[j].style.display = 'none';
          links[j].setAttribute('data-ogx-hidden', '1');
        }
      }
    });
  }

  // 1) 캐시 즉시 적용(깜빡임 최소화)
  try {
    var cached = JSON.parse(localStorage.getItem(LS) || '[]');
    if (cached && cached.length) apply(cached);
  } catch (e) {}

  // 2) 서버에서 최신값 받아 갱신
  fetch(SUPABASE_URL + '/rest/v1/app_settings?select=hidden_menus&id=eq.1', {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      var hm = (rows && rows[0] && rows[0].hidden_menus) || [];
      if (!Array.isArray(hm)) hm = [];
      try { localStorage.setItem(LS, JSON.stringify(hm)); } catch (e) {}
      apply(hm);
    })
    .catch(function () { /* 테이블 없음/오프라인 → 전체 표시 유지 */ });
})();
