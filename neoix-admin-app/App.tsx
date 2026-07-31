/**
 * NEOIX Admin — 관리 콘솔 네이티브 래퍼
 * ① neoix.kr/admin 을 앱으로 감싸 홈화면에서 바로 실행
 * ② 신규 가입 푸시 수신 (Expo 토큰을 neoix_push_tokens에 app='admin'으로 저장 →
 *    neoix-push 워커 cron이 이 토큰으로 알림 발송)
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const ADMIN_URL = 'https://neoix.kr/admin/';
const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 웹뷰(어드민)에서 로그인 세션을 꺼내와 토큰을 저장 — 관리자 계정에 묶어야 cron이 찾는다 */
const READ_SESSION_JS = `(function(){
  try {
    var k = Object.keys(localStorage).find(function(x){ return x.indexOf('-auth-token') > -1; });
    var v = k ? JSON.parse(localStorage.getItem(k)) : null;
    if (v && v.access_token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type:'session', token:v.access_token }));
    }
  } catch(e) {}
  true;
})();`;

export default function App() {
  const [loading, setLoading] = useState(true);
  const webRef = useRef<WebView>(null);
  const pushToken = useRef<string | null>(null);
  const savedFor = useRef<string | null>(null);

  // 푸시 권한 + 토큰 발급
  useEffect(() => {
    (async () => {
      if (!Device.isDevice) return;
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
      if (status !== 'granted') return;
      try {
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const t = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
        pushToken.current = t.data;
      } catch {}
    })();
  }, []);

  // 세션 토큰을 받으면 → 푸시 토큰을 그 계정으로 저장
  const onMessage = async (e: any) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type !== 'session' || !msg.token || !pushToken.current) return;
      if (savedFor.current === msg.token) return;
      savedFor.current = msg.token;
      const payload = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${msg.token}` },
      }).then((r) => (r.ok ? r.json() : null));
      if (!payload?.id) return;
      await fetch(`${SUPABASE_URL}/rest/v1/neoix_push_tokens?on_conflict=token`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${msg.token}`,
          'content-type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id: payload.id,
          token: pushToken.current,
          app: 'admin',
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        }),
      });
    } catch {}
  };

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      webRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <WebView
          ref={webRef}
          source={{ uri: ADMIN_URL }}
          style={styles.web}
          onLoadEnd={() => {
            setLoading(false);
            webRef.current?.injectJavaScript(READ_SESSION_JS);
          }}
          onMessage={onMessage}
          injectedJavaScript={READ_SESSION_JS}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          sharedCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
        />
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f5f7' },
  web: { flex: 1, backgroundColor: '#f4f5f7' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f5f7',
  },
});
