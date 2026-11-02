import { useState, useEffect, useRef } from 'react';

const SUPPORT_TOKEN_KEY = 'takapay_support_token';

export default function FloatingActionButtons() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('takapay_support_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sendError, setSendError] = useState(null);

  const chatEndRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Détection du scroll pour la flèche retour en haut
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 240) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const getStoredToken = () => {
    try {
      return localStorage.getItem(SUPPORT_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  };

  const getClientAuthToken = () => {
    try {
      return localStorage.getItem('takapay_client_token') || localStorage.getItem('takapay_admin_token') || '';
    } catch {
      return '';
    }
  };

  const getClientUser = () => {
    try {
      const u1 = localStorage.getItem('takapay-client-user');
      if (u1) return JSON.parse(u1);
      const u2 = localStorage.getItem('takapay_admin_user');
      if (u2) return JSON.parse(u2);
    } catch { /* ignore */ }
    return null;
  };

  const saveToken = (token) => {
    if (!token) return;
    try {
      localStorage.setItem(SUPPORT_TOKEN_KEY, token);
    } catch { /* ignore */ }
  };

  // Mise à jour de la liste de messages avec persistance locale
  const updateMessages = (newMessages) => {
    setMessages((prev) => {
      const listToMerge = typeof newMessages === 'function' ? newMessages(prev) : newMessages;
      const map = new Map(prev.map((m) => [m.id, m]));
      listToMerge.forEach((m) => map.set(m.id, m));
      const sorted = Array.from(map.values()).sort((a, b) => a.id - b.id);
      try {
        localStorage.setItem('takapay_support_messages', JSON.stringify(sorted));
      } catch { /* ignore */ }
      return sorted;
    });
  };

  // Récupération des messages
  const loadMessages = async (afterId = null) => {
    const token = getStoredToken();
    const authToken = getClientAuthToken();
    const clientUser = getClientUser();

    // Si ni token ni utilisateur connecté, rien à charger
    if (!token && !authToken && !clientUser) return;

    try {
      const params = new URLSearchParams();
      if (token) params.set('session_token', token);
      if (clientUser?.id) params.set('user_id', String(clientUser.id));
      if (afterId) {
        params.set('after_id', String(afterId));
      }
      params.set('_t', String(Date.now())); // Cache buster systématique anti-cache navigateur

      const url = `/api/support/messages?${params.toString()}`;

      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(token ? { 'X-Support-Token': token } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data.success) return;

      if (data.session_token) {
        saveToken(data.session_token);
      }

      if (Array.isArray(data.messages) && data.messages.length > 0) {
        updateMessages(data.messages);
      }
    } catch (err) {
      console.warn('Erreur chargement messages support:', err);
    }
  };

  // Chargement initial au montage si un token existe
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      loadMessages();
    }
  }, []);

  // Chargement complet à l'ouverture de la boîte de discussion
  useEffect(() => {
    if (showContactModal) {
      setIsLoading(true);
      setUnreadCount(0);
      loadMessages().finally(() => setIsLoading(false));
    }
  }, [showContactModal]);

  // Polling automatique rapide (2.5s) quand le chat est ouvert
  useEffect(() => {
    if (!showContactModal) return;

    let cycle = 0;
    const interval = setInterval(() => {
      cycle++;
      // Un cycle sur 4 (~10s) : synchronisation complète sans after_id
      if (cycle % 4 === 0) {
        loadMessages();
      } else {
        const currentList = messagesRef.current;
        const lastId = currentList.length > 0 ? currentList[currentList.length - 1].id : null;
        loadMessages(lastId);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showContactModal]);

  // Récupération immédiate dès que l'onglet redevient actif (ex: retour depuis l'onglet admin)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && showContactModal) {
        loadMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [showContactModal]);

  // Défilement automatique vers le dernier message
  useEffect(() => {
    if (showContactModal) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showContactModal]);

  // Envoi d'un message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || isSending) return;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSendError('Aucune connexion Internet détectée. Vérifiez votre réseau.');
      return;
    }

    setSendError(null);
    setIsSending(true);
    const token = getStoredToken();
    const authToken = getClientAuthToken();
    const clientUser = getClientUser();

    try {
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { 'X-Support-Token': token } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          session_token: token || undefined,
          user_id: clientUser?.id || undefined,
          name: clientUser ? `${clientUser.nom || ''} ${clientUser.prenom || clientUser.prenoms || ''}`.trim() : undefined,
          email: clientUser?.email || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session_token) {
          saveToken(data.session_token);
        }
        if (data.message) {
          updateMessages([data.message]);
        }
        setInputMessage('');
      } else {
        if (res.status === 429) {
          setSendError('Trop de messages envoyés. Veuillez patienter une minute.');
        } else {
          setSendError('Impossible d’envoyer le message. Veuillez réessayer.');
        }
      }
    } catch (err) {
      console.error('Erreur lors de l’envoi du message:', err);
      setSendError('Erreur de connexion. Vérifiez votre accès réseau.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div
        className="takapay-floating-actions"
        style={{
          position: 'fixed',
          right: 'clamp(12px, 3vw, 20px)',
          bottom: 'clamp(14px, 3vw, 24px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Bouton Chat Service Clientèle */}
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          title="Discuter avec le service clientèle"
          aria-label="Discuter avec le service clientèle"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 8px 24px rgba(198, 40, 40, 0.4), 0 2px 6px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '26px' }}>
            chat
          </span>

          {/* Pastille de notification si message non lu */}
          {unreadCount > 0 && !showContactModal && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: '#22c55e',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Bouton Retour en haut */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Revenir en haut"
            aria-label="Revenir en haut de page"
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#c62828',
              border: '1.5px solid rgba(198, 40, 40, 0.2)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.background = '#fff5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '24px', fontWeight: 700 }}>
              arrow_upward
            </span>
          </button>
        )}
      </div>

      {/* Widget / Fenêtre de Chat Service Clientèle */}
      {showContactModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            padding: 'clamp(10px, 3vw, 24px)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowContactModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              height: '520px',
              maxHeight: 'calc(100vh - 32px)',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
              border: '1px solid #f0e6e5',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            {/* En-tête du Chat */}
            <div
              style={{
                background: 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)',
                color: '#ffffff',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '22px' }}>
                    support_agent
                  </span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Service Clientèle</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', opacity: 0.95 }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 6px #22c55e',
                        display: 'inline-block',
                      }}
                    />
                    <span>En ligne · Takapay Bénin</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                title="Fermer la discussion"
              >
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Corps du Chat : Fil des messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Message de bienvenue initial */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: '#475569',
                  lineHeight: 1.45,
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1e293b' }}>
                  👋 Bienvenue sur le chat d'assistance !
                </p>
                <span>
                  Posez votre question sur vos commandes, cagnottes ou livraisons. Un conseiller vous répond en direct.
                </span>
              </div>

              {isLoading && messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                  Chargement de la conversation...
                </div>
              )}

              {/* Liste des bulles de messages */}
              {messages.map((m) => {
                const isClient = m.sender_type === 'client';
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isClient ? 'flex-end' : 'flex-start',
                      maxWidth: '100%',
                    }}
                  >
                    {!isClient && (
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '3px', marginLeft: '4px' }}>
                        Conseiller TakaPay
                      </span>
                    )}
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '10px 14px',
                        borderRadius: isClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isClient
                          ? 'linear-gradient(135deg, #c62828 0%, #b71c1c 100%)'
                          : '#ffffff',
                        color: isClient ? '#ffffff' : '#1e293b',
                        border: isClient ? 'none' : '1px solid #e2e8f0',
                        boxShadow: isClient
                          ? '0 3px 10px rgba(198, 40, 40, 0.25)'
                          : '0 2px 6px rgba(0, 0, 0, 0.04)',
                        fontSize: '13px',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {m.message}
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        color: '#94a3b8',
                        marginTop: '3px',
                        padding: isClient ? '0 4px 0 0' : '0 0 0 4px',
                      }}
                    >
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                );
              })}

              <div ref={chatEndRef} />
            </div>

            {/* Pied du Chat : Zone de saisie et d'envoi */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '12px 14px',
                background: '#ffffff',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              <input
                type="text"
                placeholder="Écrivez votre message..."
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  if (sendError) setSendError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '24px',
                  border: '1.5px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '13px',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#c62828')}
                onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isSending}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: !inputMessage.trim() || isSending ? '#cbd5e1' : '#c62828',
                  color: '#ffffff',
                  border: 'none',
                  cursor: !inputMessage.trim() || isSending ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s, transform 0.15s',
                }}
                title="Envoyer"
              >
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>
                  send
                </span>
              </button>
            </form>

            {sendError && (
              <div
                style={{
                  fontSize: '11.5px',
                  color: '#dc2626',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '15px' }}>
                  error
                </span>
                <span>{sendError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
