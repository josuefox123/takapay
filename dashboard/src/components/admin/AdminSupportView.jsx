import { useState, useEffect, useRef } from 'react';
import { adminService } from '../../services/adminService';
import AdminIcon from './AdminIcon';

export default function AdminSupportView({ onShowToast, onUnreadCountChange }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [search, setSearch] = useState('');

  const messagesContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  const scrollToBottom = (smooth = false) => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const handleMessagesScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Si l'utilisateur est remonté de plus de 80px au-dessus du bas, il consulte l'historique
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    userScrolledUpRef.current = !isAtBottom;
  };

  // Charger la liste des conversations
  const loadConversations = async () => {
    try {
      const res = await adminService.getSupportConversations();
      const list = res?.data || (Array.isArray(res) ? res : []);
      setConversations(list);

      // Calculer le total non lu
      const totalUnread = list.reduce(
        (acc, c) => acc + (c.unread_messages_for_admin_count || 0),
        0
      );
      if (onUnreadCountChange) onUnreadCountChange(totalUnread);
    } catch (err) {
      console.warn('Erreur chargement conversations:', err);
    }
  };

  // Charger les messages de la conversation sélectionnée
  const loadActiveConversation = async (id, isBackground = false) => {
    if (!id) return;
    try {
      const data = await adminService.getSupportConversation(id);
      if (data?.success) {
        setActiveConversation(data.conversation);
        setMessages(data.messages || []);

        if (!isBackground) {
          userScrolledUpRef.current = false;
          setTimeout(() => scrollToBottom(false), 50);
          loadConversations();
        } else {
          // En arrière-plan : ne pas scroller si l'admin lit les anciens messages
          if (!userScrolledUpRef.current) {
            scrollToBottom(false);
          }
        }
      }
    } catch (err) {
      console.warn('Erreur chargement fil de discussion:', err);
    }
  };

  // Chargement initial
  useEffect(() => {
    loadConversations();
  }, []);

  // Sélection manuelle d'une conversation
  const handleSelectConversation = (id) => {
    setSelectedConvId(id);
    userScrolledUpRef.current = false;
    loadActiveConversation(id, false);
  };

  // Polling automatique pour les messages de la conversation active et la liste
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (selectedConvId) {
          loadActiveConversation(selectedConvId, true);
        }
        loadConversations();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConvId]);

  // Envoyer une réponse admin
  const handleSendReply = async (e) => {
    if (e) e.preventDefault();
    const text = replyText.trim();
    if (!text || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      const res = await adminService.replySupportConversation(selectedConvId, text);
      if (res?.message) {
        setMessages((prev) => [...prev, res.message]);
        setReplyText('');
        userScrolledUpRef.current = false;
        setTimeout(() => scrollToBottom(true), 50);
        loadConversations();
        if (onShowToast) onShowToast('Réponse envoyée au client');
      }
    } catch (err) {
      if (onShowToast) onShowToast(err.message || 'Erreur lors de l’envoi');
    } finally {
      setIsSending(false);
    }
  };

  // Clôturer une conversation
  const handleCloseConversation = async () => {
    if (!selectedConvId) return;
    try {
      await adminService.closeSupportConversation(selectedConvId);
      if (onShowToast) onShowToast('Conversation marquée comme clôturée');
      loadActiveConversation(selectedConvId, false);
      loadConversations();
    } catch {
      if (onShowToast) onShowToast('Impossible de clôturer la discussion');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getClientTitle = (conv) => {
    if (conv.user) {
      const full = `${conv.user.nom || ''} ${conv.user.prenom || ''}`.trim();
      return full || conv.user.email || `Client #${conv.user.id}`;
    }
    return `Visiteur #${conv.id}`;
  };

  // Filtrage des conversations
  const filteredConversations = conversations.filter((c) => {
    if (filter === 'unread' && (!c.unread_messages_for_admin_count || c.unread_messages_for_admin_count <= 0)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const title = getClientTitle(c).toLowerCase();
      const lastMsg = (c.latest_message?.message || '').toLowerCase();
      return title.includes(q) || lastMsg.includes(q);
    }
    return true;
  });

  return (
    <div style={{ paddingBottom: '30px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 className="admin-header-title">Support & Assistance Clientèle</h1>
        <p className="admin-header-sub">
          Répondez en direct aux messages et questions des visiteurs et clients
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: '20px',
          height: 'calc(100vh - 220px)',
          minHeight: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--bd, #e5e7eb)',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* COLONNE GAUCHE : Liste des conversations */}
        <div
          style={{
            borderRight: '1px solid var(--bd, #e5e7eb)',
            display: 'flex',
            flexDirection: 'column',
            background: '#fafbfc',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Barre de recherche et filtres */}
          <div style={{ padding: '14px', borderBottom: '1px solid #eef0f2', background: '#ffffff' }}>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Rechercher une discussion..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFilter('all')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filter === 'all' ? 'var(--r, #dc2626)' : '#edf2f7',
                  color: filter === 'all' ? '#ffffff' : '#4a5568',
                  transition: 'all 0.2s',
                }}
              >
                Toutes ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: filter === 'unread' ? '#dc2626' : '#edf2f7',
                  color: filter === 'unread' ? '#ffffff' : '#4a5568',
                  transition: 'all 0.2s',
                }}
              >
                Non lues
              </button>
            </div>
          </div>

          {/* Liste déroulante */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Aucune discussion trouvée.
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const unreadCount = c.unread_messages_for_admin_count || 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      background: isSelected ? '#fee2e2' : unreadCount > 0 ? '#fff8f8' : '#ffffff',
                      borderLeft: isSelected ? '4px solid var(--r, #dc2626)' : '4px solid transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontWeight: unreadCount > 0 || isSelected ? 700 : 600, fontSize: '13px', color: '#1e293b' }}>
                        {getClientTitle(c)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {formatTime(c.last_message_at)}
                      </span>
                    </div>

                    {c.user?.telephone && (
                      <div style={{ fontSize: '11px', color: '#0284c7', marginBottom: '4px', fontWeight: 500 }}>
                        📞 {c.user.telephone}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                          color: unreadCount > 0 ? '#1e293b' : '#64748b',
                          fontWeight: unreadCount > 0 ? 600 : 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {c.latest_message ? c.latest_message.message : 'Pas encore de message'}
                      </p>

                      {unreadCount > 0 && (
                        <span
                          style={{
                            background: 'var(--r, #dc2626)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            flexShrink: 0,
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLONNE DROITE : Fil de discussion et réponse */}
        <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {!selectedConvId ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                }}
              >
                <AdminIcon name="message" size={28} />
              </div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                Sélectionnez une discussion pour afficher les messages et répondre
              </p>
            </div>
          ) : (
            <>
              {/* En-tête de la conversation active avec identité claire */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #eef0f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: activeConversation?.user ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' : '#f1f5f9',
                      color: activeConversation?.user ? '#dc2626' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {activeConversation?.user
                      ? `${(activeConversation.user.nom || '')[0] || ''}${(activeConversation.user.prenom || '')[0] || ''}`.toUpperCase() || 'U'
                      : 'V'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                        {activeConversation ? getClientTitle(activeConversation) : 'Discussion'}
                      </h3>
                      {activeConversation?.user ? (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            padding: '1px 7px',
                            borderRadius: '10px',
                          }}
                        >
                          Client #{activeConversation.user.id}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#f8fafc',
                            color: '#64748b',
                            border: '1px solid #e2e8f0',
                            padding: '1px 7px',
                            borderRadius: '10px',
                          }}
                        >
                          Visiteur
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                      {activeConversation?.user?.telephone && (
                        <span>📞 <strong>{activeConversation.user.telephone}</strong></span>
                      )}
                      {activeConversation?.user?.email && (
                        <span>📧 {activeConversation.user.email}</span>
                      )}
                      <span style={{ color: '#94a3b8' }}>💬 Discussion #{activeConversation?.id}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: activeConversation?.status === 'closed' ? '#f1f5f9' : '#dcfce7',
                      color: activeConversation?.status === 'closed' ? '#64748b' : '#15803d',
                    }}
                  >
                    {activeConversation?.status === 'closed' ? 'Clôturée' : '● Ouverte'}
                  </span>

                  {activeConversation?.status !== 'closed' && (
                    <button
                      type="button"
                      onClick={handleCloseConversation}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Clôturer
                    </button>
                  )}
                </div>
              </div>

              {/* Zone des messages avec défilement complet de l'historique */}
              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '18px 20px',
                  background: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 'auto' }}>
                    Aucun message dans cette conversation.
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_type === 'admin';
                    const clientName = activeConversation?.user
                      ? `${activeConversation.user.nom || ''} ${activeConversation.user.prenom || ''}`.trim()
                      : 'Client (Visiteur)';

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAdmin ? 'flex-end' : 'flex-start',
                          maxWidth: '100%',
                        }}
                      >
                        <span style={{ fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: 600 }}>
                          {isAdmin ? '🛡️ Vous (Support Takapay)' : `👤 ${clientName}`}
                        </span>
                        <div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            background: isAdmin ? 'var(--r, #dc2626)' : '#ffffff',
                            color: isAdmin ? '#ffffff' : '#1e293b',
                            border: isAdmin ? 'none' : '1px solid #e2e8f0',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                            fontSize: '13px',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.message}
                        </div>
                        <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px' }}>
                          {formatDate(m.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulaire de réponse */}
              <form
                onSubmit={handleSendReply}
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #eef0f2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                }}
              >
                <input
                  type="text"
                  placeholder="Écrivez votre réponse au client... (Entrée pour envoyer)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #e2e8f0',
                    outline: 'none',
                    fontSize: '13px',
                  }}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  style={{
                    background: !replyText.trim() || isSending ? '#cbd5e1' : 'var(--r, #dc2626)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: !replyText.trim() || isSending ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Envoyer</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
