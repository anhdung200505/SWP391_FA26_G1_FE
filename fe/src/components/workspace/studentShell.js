import { createContext, useContext, useEffect } from 'react';

export const PublishContext = createContext(() => {});

/**
 * Trang con báo cho StudentLayout những phần riêng của nó (breadcrumb, menu cuộn theo mục, ...).
 * `extra` chỉ được gửi lại khi một giá trị trong `deps` đổi.
 */
export function useStudentShell(extra, deps) {
  const publish = useContext(PublishContext);
  useEffect(() => {
    publish(extra);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => publish(null), [publish]);
}
