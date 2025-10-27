import React, { createContext, useState } from 'react'

export const AppContext = createContext({ message: '', setMessage: (m: string) => {} })

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('')
  return <AppContext.Provider value={{ message, setMessage }}>{children}</AppContext.Provider>
}
