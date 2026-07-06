'use client'

// Wrapper minimalista — o script inline no layout já aplica a classe antes
// do React hidratar, então não há flash. Este componente existe para que
// futuros sub-componentes possam usar um contexto de tema se necessário.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
