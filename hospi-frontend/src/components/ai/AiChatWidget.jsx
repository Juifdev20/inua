import { useState, useEffect, useRef } from "react";
import { getApiUrl } from "../../config/environment";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";

const AiChatWidget = ({ patientId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUrgentReminder, setHasUrgentReminder] = useState(false);
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Détection de la taille de l'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Animation douce pour l'icône
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gentleFloat {
        0%, 100% {
          transform: translateY(0px) rotate(0deg);
        }
        50% {
          transform: translateY(-3px) rotate(2deg);
        }
      }
      .ai-icon-animate {
        animation: gentleFloat 3s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auto-open après 5 secondes avec message de bienvenue
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
      fetchWelcomeMessage();
    }, 5000);
    return () => clearTimeout(timer);
  }, [patientId]);

  const fetchWelcomeMessage = async () => {
    setIsLoading(true);
    try {
      const patientName = user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
      const res = await fetch(getApiUrl('/api/ai/chat'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ patientId, message: "__WELCOME__", patientName }),
      });
      const data = await res.json();
      
      if (data && data.response) {
        setMessages([{ role: "ai", text: data.response }]);

        // Activer le point rouge si rappel urgent
        if (data.response.includes("⚠️") || data.response.includes("rappel")) {
          setHasUrgentReminder(true);
        }
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du message de bienvenue:", error);
      const patientName = user?.firstName || user?.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
      const greeting = patientName ? `Bonjour ${patientName} !` : 'Bonjour !';
      setMessages([
        {
          role: "ai",
          text: `${greeting} Je suis Inua Afya IA, votre assistant santé personnel. Comment puis-je vous aider ?`,
        },
      ]);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || input.length > 500) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/ai/chat'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ patientId, message: input }),
      });
      const data = await res.json();
      
      if (data && data.response) {
        setMessages((prev) => [...prev, { role: "ai", text: data.response }]);
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Je suis désolé, une erreur s'est produite. Veuillez réessayer plus tard.",
        },
      ]);
    }
    setIsLoading(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasUrgentReminder(false);
        }}
        style={{
          position: "fixed",
          bottom: isMobile ? "16px" : "24px",
          right: isMobile ? "16px" : "24px",
          width: isMobile ? "48px" : "56px",
          height: isMobile ? "48px" : "56px",
          borderRadius: "50%",
          backgroundColor: "#1D9E75",
          border: "none",
          cursor: "pointer",
          zIndex: 1000,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Ouvrir l'assistant IA"
      >
        {/* Icône robot médical */}
        <span className="ai-icon-animate" style={{ fontSize: isMobile ? "20px" : "24px" }}>🤖</span>

        {/* Point rouge — rappel urgent */}
        {hasUrgentReminder && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              width: isMobile ? "10px" : "12px",
              height: isMobile ? "10px" : "12px",
              borderRadius: "50%",
              backgroundColor: "#E24B4A",
              border: "2px solid white",
            }}
          />
        )}
      </button>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div
          style={{
            position: isMobile ? "fixed" : "fixed",
            bottom: isMobile ? "0" : "90px",
            right: isMobile ? "0" : "24px",
            left: isMobile ? "0" : "auto",
            width: isMobile ? "100%" : (isTablet ? "400px" : "340px"),
            height: isMobile ? "100%" : (isTablet ? "520px" : "480px"),
            borderRadius: isMobile ? "0" : "16px",
            backgroundColor: theme === 'dark' ? "#1f2937" : "#ffffff",
            border: isMobile ? "none" : (theme === 'dark' ? "1px solid #374151" : "1px solid #e5e7eb"),
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
            boxShadow: isMobile ? "none" : (theme === 'dark' ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.15)"),
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: isMobile ? "16px" : "12px 16px",
              backgroundColor: "#1D9E75",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: isMobile ? "24px" : "20px" }}>🤖</span>
            <div>
              <div
                style={{
                  color: "white",
                  fontWeight: 500,
                  fontSize: isMobile ? "16px" : "14px",
                }}
              >
                Inua Afya IA
              </div>
              <div
                style={{
                  color: "#9FE1CB",
                  fontSize: isMobile ? "12px" : "11px",
                }}
              >
                Assistant santé personnel
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: isMobile ? "24px" : "18px",
                padding: isMobile ? "8px 12px" : "4px 8px",
                borderRadius: "4px",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: isMobile ? "16px" : "12px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "12px" : "8px",
              backgroundColor: theme === 'dark' ? "#111827" : "#f9fafb",
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf:
                    msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: isMobile ? "90%" : "80%",
                  padding: isMobile ? "12px 16px" : "8px 12px",
                  borderRadius:
                    msg.role === "user"
                      ? "12px 12px 2px 12px"
                      : "12px 12px 12px 2px",
                  backgroundColor:
                    msg.role === "user" ? "#1D9E75" : (theme === 'dark' ? "#374151" : "#ffffff"),
                  color: msg.role === "user" ? "white" : (theme === 'dark' ? "#f3f4f6" : "#1f2937"),
                  fontSize: isMobile ? "15px" : "13px",
                  lineHeight: "1.5",
                  boxShadow: theme === 'dark' ? "0 1px 2px rgba(0,0,0,0.3)" : "0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {msg.text}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  color: theme === 'dark' ? "#9ca3af" : "#6b7280",
                  fontSize: isMobile ? "14px" : "12px",
                  fontStyle: "italic",
                  padding: isMobile ? "12px 16px" : "8px 12px",
                }}
              >
                Inua Afya IA écrit...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: isMobile ? "16px" : "12px",
              borderTop: theme === 'dark' ? "1px solid #374151" : "1px solid #e5e7eb",
              display: "flex",
              gap: isMobile ? "12px" : "8px",
              backgroundColor: theme === 'dark' ? "#1f2937" : "#ffffff",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              maxLength={500}
              placeholder="Posez votre question..."
              style={{
                flex: 1,
                padding: isMobile ? "12px 16px" : "8px 12px",
                borderRadius: "20px",
                border: theme === 'dark' ? "1px solid #374151" : "1px solid #e5e7eb",
                backgroundColor: theme === 'dark' ? "#111827" : "#f9fafb",
                color: theme === 'dark' ? "#f3f4f6" : "#1f2937",
                fontSize: isMobile ? "15px" : "13px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "#1D9E75")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = theme === 'dark' ? "#374151" : "#e5e7eb")
              }
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                padding: isMobile ? "12px 24px" : "8px 14px",
                borderRadius: "20px",
                backgroundColor: "#1D9E75",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: isMobile ? "15px" : "13px",
                fontWeight: isMobile ? "500" : "normal",
                opacity: isLoading || !input.trim() ? 0.5 : 1,
                transition: "opacity 0.2s",
                whiteSpace: "nowrap",
                minWidth: isMobile ? "80px" : "auto",
              }}
            >
              Envoyer
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AiChatWidget;
