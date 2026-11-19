import { useState } from 'react';
import { getMessageLinks } from '../utils/sharing.js';
import Icon from './Icon.jsx';

function MessageActions({ phone, message }) {
  const [notice, setNotice] = useState('');
  const links = getMessageLinks(phone, message);
  async function copyMessage() {
    try { await navigator.clipboard.writeText(message); setNotice('Message copied. Paste it into your messaging app and send.'); }
    catch { setNotice('Copy is unavailable here. Select and copy the message below.'); }
  }
  return <div className="message-actions">
    <div className="button-row">{links && <><a className="button button-whatsapp" href={links.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a><a className="button button-secondary" href={links.sms}><Icon name="message" size={17} />SMS</a></>}<button className="button button-quiet" onClick={copyMessage}><Icon name="copy" size={16} />Copy message</button></div>
    {notice && <p className="field-hint" role="status">{notice}</p>}
    <details className="message-details"><summary>View message</summary><p>{message}</p></details>
  </div>;
}

export default MessageActions;
