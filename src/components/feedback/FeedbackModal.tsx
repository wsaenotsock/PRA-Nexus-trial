'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: 'ja' | 'en';
}

type FeedbackType = 'suggestion' | 'bug' | 'question' | 'other';

export default function FeedbackModal({ isOpen, onClose, locale }: FeedbackModalProps) {
  const userName = useProjectStore(s => s.userName) || 'Unknown User';
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          content,
          user: userName
        })
      });

      if (!res.ok) throw new Error('Failed to send feedback');
      
      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      setError(locale === 'ja' ? '送信中にエラーが発生しました。' : 'An error occurred during transmission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after modal transition
    setTimeout(() => {
      setIsSuccess(false);
      setContent('');
      setError('');
      setType('suggestion');
    }, 300);
  };

  if (!isOpen) return null;

  const t = {
    title: locale === 'ja' ? '要望・フィードバックを送信' : 'Send Feedback',
    desc: locale === 'ja' ? '本解析ツール（Quantica Risk）へのご要望や改善点をお寄せください。開発者にて確認いたします。' : 'Please send us your suggestions or improvements for Quantica Risk. The developers will review them.',
    typeLabel: locale === 'ja' ? '種別' : 'Category',
    suggestion: locale === 'ja' ? '機能要望・改善' : 'Suggestion / Feature',
    bug: locale === 'ja' ? '不具合報告' : 'Bug Report',
    question: locale === 'ja' ? '質問' : 'Question',
    other: locale === 'ja' ? 'その他' : 'Other',
    contentPlaceholder: locale === 'ja' ? 'ここにご要望内容を入力してください...' : 'Enter your feedback here...',
    submit: locale === 'ja' ? '送信する' : 'Submit',
    submitting: locale === 'ja' ? '送信中...' : 'Submitting...',
    success: locale === 'ja' ? '✓ 送信が完了しました！' : '✓ Feedback sent successfully!',
    cancel: locale === 'ja' ? 'キャンセル' : 'Cancel',
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={handleClose}>
      <div style={{
        background: 'linear-gradient(145deg, var(--bg-elevated), #1e293b)',
        width: '90%',
        maxWidth: '450px',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        borderTop: '4px solid var(--accent-blue)',
        position: 'relative',
        transform: 'translateY(0)',
        animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Decor Background Glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-20%',
          width: '150px',
          height: '150px',
          background: 'var(--accent-blue)',
          filter: 'blur(80px)',
          opacity: 0.15,
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <span style={{ fontSize: '24px' }}>💬</span> {t.title}
          </h3>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {t.desc}
          </p>
        </div>

        {isSuccess ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--accent-green)',
            fontSize: '16px',
            fontWeight: 600,
            animation: 'scaleIn 0.4s ease'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            {t.success}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                {t.typeLabel}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['suggestion', 'bug', 'question', 'other'] as const).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setType(option)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: type === option ? 'var(--accent-blue)' : 'var(--border-default)',
                      background: type === option ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                      color: type === option ? 'var(--accent-blue)' : 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center'
                    }}
                  >
                    {t[option]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                autoFocus
                required
                placeholder={t.contentPlaceholder}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  padding: '12px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>

            {error && (
              <div style={{ color: 'var(--accent-red)', fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '6px' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleClose}
                className="btn btn--secondary"
                style={{ flex: 1, height: '42px', borderRadius: '10px', fontWeight: 600 }}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="btn btn--primary"
                style={{ 
                  flex: 2, 
                  height: '42px', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  letterSpacing: '0.5px',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)'
                }}
              >
                {isSubmitting ? t.submitting : t.submit}
              </button>
            </div>
          </form>
        )}
        
        {/* Embedded CSS for Keyframe animations */}
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes scaleIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}
