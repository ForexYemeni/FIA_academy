'use client'
import React from 'react'

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6" dir="rtl">
          <div className="text-center max-w-md">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-xl border border-gold/30">
                <svg className="w-10 h-10 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <h2 className="font-bold text-navy text-lg mb-2">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-muted-foreground mb-4">
              نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-navy to-navy-light text-gold font-bold text-sm shadow-md active:scale-95 transition-all"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-navy font-bold text-sm hover:bg-gray-50 transition-all"
              >
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
