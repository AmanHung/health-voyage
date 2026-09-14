import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api, type Auth } from './api';
type Accounts = { emails: string[]; version: string };
export function AdminAccounts({
  auth,
  currentEmail,
}: {
  auth: Auth;
  currentEmail: string;
}) {
  const [data, setData] = useState<Accounts | null>(null),
    [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [pending, setPending] = useState<{
    email: string;
    operation: 'add' | 'remove';
  } | null>(null);
  const request = useRef({ signature: '', id: '' });
  async function load() {
    setBusy(true);
    setError('');
    try {
      setData(await api<Accounts>(auth, 'admin.accounts'));
      setPending(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [auth]);
  async function save() {
    if (!data || !pending || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const body = { ...pending, version: data.version };
    const signature = JSON.stringify(body);
    if (request.current.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    try {
      setData(
        await api<Accounts>(auth, 'admin.accountChange', {
          ...body,
          requestId: request.current.id,
        }),
      );
      setNotice(
        pending.operation === 'add'
          ? '已新增管理員，對方可使用此 Google 帳號登入。'
          : '已移除管理員權限。',
      );
      setPending(null);
      setEmail('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface">
      <details>
        <summary>管理員帳號管理</summary>
        <p>管理員可查看所有個案資料、維護用藥與管理其他管理員。</p>
        <Button variant="outline" disabled={busy} onClick={() => void load()}>
          重新載入管理員
        </Button>
        {error && (
          <p className="prod-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {data && (
          <>
            <ul>
              {data.emails.map((account) => (
                <li key={account}>
                  {account}
                  {account === currentEmail ? (
                    '（目前帳號）'
                  ) : (
                    <Button
                      variant="ghost"
                      disabled={busy || !!pending || data.emails.length <= 1}
                      onClick={() => {
                        setPending({ email: account, operation: 'remove' });
                        setNotice('');
                      }}
                    >
                      移除管理員
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {!pending ? (
              <form
                className="prod-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  setPending({
                    email: email.trim().toLowerCase(),
                    operation: 'add',
                  });
                  setNotice('');
                }}
              >
                <label>
                  新增管理員的 Google 帳號
                  <Input
                    type="email"
                    value={email}
                    maxLength={254}
                    required
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={busy || !email.trim()}>
                  新增管理員
                </Button>
              </form>
            ) : (
              <div>
                <p>
                  {pending.operation === 'add'
                    ? '確認授予完整管理員權限：'
                    : '確認移除管理員權限：'}
                  <strong>{pending.email}</strong>
                </p>
                <Button disabled={busy} onClick={() => void save()}>
                  {busy ? '儲存中…' : '確認變更'}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  取消
                </Button>
              </div>
            )}
            <p className="prod-login-note">
              至少保留一位管理員。目前登入帳號須由另一位管理員移除。
            </p>
          </>
        )}
      </details>
    </section>
  );
}
