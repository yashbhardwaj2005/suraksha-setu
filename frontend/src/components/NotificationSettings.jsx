import { useEffect, useState } from 'react';
import { supportsPush, enablePush, disablePush } from '../services/notifications.js';
import { getSafetyError } from '../services/safety.service.js';
import Icon from './Icon.jsx';
import { api } from '../services/api.js';

function NotificationSettings() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!supportsPush()) return;
    let mounted = true;
    navigator.serviceWorker.getRegistration('/').then(registration => registration?.pushManager.getSubscription()).then(async subscription => { if (subscription) await api.post('/push/subscriptions', subscription.toJSON()); if (mounted) setEnabled(Boolean(subscription)); }).catch(() => {});
    return () => { mounted = false; };
  }, []);
  async function toggle() {
    setBusy(true); setMessage('');
    try { if (enabled) { await disablePush(); setEnabled(false); } else { await enablePush(); setEnabled(true); } }
    catch (error) { setMessage(error.response ? getSafetyError(error) : error.message); }
    finally { setBusy(false); }
  }
  return <section className="card notification-settings"><div className="section-heading"><div><p className="eyebrow">AUTOMATIC ALERTS</p><h2>Let requests reach this device.</h2></div><Icon name="bell" /></div><p>Enable free push alerts for your connected contacts and nearby requests when you are available as a volunteer. Internet and notification permission are required; delivery is not guaranteed.</p><div className="button-row"><button className={'button ' + (enabled ? 'button-secondary' : 'button-primary')} onClick={toggle} disabled={busy}>{busy ? 'Updating...' : enabled ? 'Disable notifications on this device' : 'Enable automatic notifications'}</button><span className={'badge ' + (enabled ? 'badge-teal' : '')}>{enabled ? 'Device connected' : 'Not enabled'}</span></div>{message && <p className="notice" role="status">{message}</p>}<p className="field-hint">On iPhone, add SurakshaSetu to your Home Screen and open it there first. Notifications contain no exact location; opening an alert checks your access.</p></section>;
}

export default NotificationSettings;
