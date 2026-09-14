import { useCallback, useEffect, useState } from 'react';

type State<T> = {
  data: T | undefined;
  loading: boolean;
  error: string;
};

/**
 * 관리자 화면의 조회 한 건.
 *
 * 화면마다 로딩·에러 상태를 다시 짜면 어떤 화면은 실패를 조용히 삼킨다.
 * 운영 화면에서 빈 목록과 조회 실패가 같아 보이면 안 된다.
 */
export function useAsync<T>(load: () => Promise<{ data: T }>, deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: undefined, loading: true, error: '' });

  // load는 매 렌더 새로 만들어지므로 의존성에서 제외하고 호출부의 deps를 신뢰한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: '' }));
    load()
      .then((response) => {
        if (!cancelled) setState({ data: response.data, loading: false, error: '' });
      })
      .catch((reason) => {
        if (!cancelled) {
          setState({
            data: undefined,
            loading: false,
            error: reason instanceof Error ? reason.message : '불러오지 못했습니다.',
          });
        }
      });
    return () => { cancelled = true; };
  }, deps);

  const [nonce, setNonce] = useState(0);
  useEffect(run, [run, nonce]);

  return { ...state, reload: () => setNonce((value) => value + 1) };
}
