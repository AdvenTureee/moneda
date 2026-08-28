declare module 'ofx-parser' {
  interface OFXTransaction {
    DTPOSTED?: string;
    TRNAMT?: string;
    NAME?: string;
    MEMO?: string;
    FITID?: string;
    CHECKNUM?: string;
  }

  interface OFXStatement {
    transactions?: OFXTransaction[];
    ledgerBalance?: {
      BALAMT?: string;
      DTASOF?: string;
    };
  }

  interface OFXAccount {
    acctId?: string;
    acctType?: string;
    bankId?: string;
    statements?: OFXStatement[];
  }

  interface OFXResult {
    header: Record<string, string>;
    body: {
      OFX: {
        BANKMSGSRSV1: {
          STMTTRNRS: {
            STMTRS: {
              CURDEF: string;
              BANKACCTFROM: {
                BANKID: string;
                ACCTID: string;
                ACCTTYPE: string;
              };
              BANKTRANLIST: {
                DTSTART: string;
                DTEND: string;
                STMTTRN: OFXTransaction | OFXTransaction[];
              };
              LEDGERBAL: {
                BALAMT: string;
                DTASOF: string;
              };
            };
          };
        };
      };
    };
  }

  export function parse(content: string): OFXResult;
  export function parseSync(content: string): OFXResult;
}
