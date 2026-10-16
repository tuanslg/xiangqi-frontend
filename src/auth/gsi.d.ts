/** The slice of Google Identity Services (accounts.google.com/gsi/client) we use. */
interface GsiCredentialResponse {
  credential: string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string
          callback: (response: GsiCredentialResponse) => void
          nonce?: string
          auto_select?: boolean
          ux_mode?: 'popup' | 'redirect'
        }): void
        renderButton(
          parent: HTMLElement,
          options: { theme?: string; size?: string; text?: string; shape?: string; locale?: string; width?: number },
        ): void
        disableAutoSelect(): void
      }
    }
  }
}
