export type ClientStore = {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  clear: () => void
}

const clientStore: ClientStore = {
  get: () => undefined,
  set: () => {},
  clear: () => {},
}

export default clientStore
export { clientStore }
