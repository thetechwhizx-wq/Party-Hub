/**
 * chat.js — In-Game Chat & Live Emoji Reactions
 * Party Hub shared module
 *
 * Provides real-time floating emoji reactions and chat messages over PeerJS.
 */

import { EventBus } from '../core/event-bus.js';
import { MSG, buildMessage } from '../core/multiplayer.js';

const EMOJIS = ['🔥', '😂', '💀', '👏', '😮', '👑'];

export class ChatSystem {
  constructor(transport, localPlayer) {
    this._transport = transport;
    this._localPlayer = localPlayer;
    this._mounted = false;

    EventBus.on('multiplayer:message', ({ message }) => {
      if (message.type === MSG.REACTION) {
        this.spawnFloatingEmoji(message.payload.emoji, false);
      } else if (message.type === MSG.CHAT_MESSAGE) {
        EventBus.emit('chat:received', message.payload);
      }
    });
  }

  sendReaction(emoji) {
    this.spawnFloatingEmoji(emoji, true);
    if (this._transport) {
      this._transport.send(buildMessage(
        MSG.REACTION,
        this._transport.getRoomId() || 'global',
        this._localPlayer.id,
        { emoji, senderName: this._localPlayer.displayName }
      ));
    }
  }

  sendMessage(text) {
    if (!text || !text.trim()) return;
    const msg = {
      text: text.trim().slice(0, 120),
      senderName: this._localPlayer.displayName,
      senderId: this._localPlayer.id,
      timestamp: Date.now(),
    };

    EventBus.emit('chat:received', msg);

    if (this._transport) {
      this._transport.send(buildMessage(
        MSG.CHAT_MESSAGE,
        this._transport.getRoomId() || 'global',
        this._localPlayer.id,
        msg
      ));
    }
  }

  spawnFloatingEmoji(emoji, isLocal = false) {
    const el = document.createElement('div');
    el.className = 'floating-emoji';
    el.textContent = emoji;

    // Random horizontal position near center/right
    const left = isLocal ? Math.random() * 20 + 75 : Math.random() * 20 + 10;
    el.style.left = `${left}%`;
    el.style.bottom = '80px';

    document.body.appendChild(el);

    setTimeout(() => {
      el.remove();
    }, 2000);
  }

  mountDock(container) {
    if (document.getElementById('reaction-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'reaction-dock';
    dock.className = 'reaction-dock';
    dock.innerHTML = `
      <div class="reaction-buttons">
        ${EMOJIS.map(e => `
          <button class="reaction-btn" data-emoji="${e}" title="Send reaction">${e}</button>
        `).join('')}
      </div>
    `;

    dock.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sendReaction(btn.dataset.emoji);
      });
    });

    document.body.appendChild(dock);
  }

  unmountDock() {
    document.getElementById('reaction-dock')?.remove();
  }
}
