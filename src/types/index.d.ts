export {};

declare global {
  interface Window {
    ethereum: any; //any; // 👈️ turn off type checking
  }
}