declare module "qrcode/lib/browser.js" {
  type Options = {
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    type?: "svg";
    width?: number;
  };

  const QRCode: {
    toString(value: string, options?: Options): Promise<string>;
  };

  export default QRCode;
}
