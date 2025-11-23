import { soap } from 'strong-soap';

export interface GenericSoapClient {
  addSoapHeader: (...args: unknown[]) => void;
  [key: string]: unknown;
}

interface CreateClientOptions {
  wsdlUrl: string;
  endpoint?: string;
  authHeaderXml?: string;
  namespacePrefix?: string;
  namespaceUri?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSanMarAuthHeader(options: {
  username: string;
  password: string;
  namespacePrefix?: string;
  namespaceUri?: string;
}): string {
  const prefix = options.namespacePrefix ?? 'tem';
  const namespace = options.namespaceUri ?? 'http://tempuri.org/';
  return `
    <${prefix}:Authentication xmlns:${prefix}="${namespace}">
      <${prefix}:UserName>${escapeXml(options.username)}</${prefix}:UserName>
      <${prefix}:Password>${escapeXml(options.password)}</${prefix}:Password>
    </${prefix}:Authentication>
  `
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getSanMarClient(options: CreateClientOptions): Promise<GenericSoapClient> {
  return new Promise((resolve, reject) => {
    soap.createClient(
      options.wsdlUrl,
      {
        endpoint: options.endpoint,
      },
      (err: unknown, client: GenericSoapClient) => {
        if (err) {
          reject(err);
          return;
        }
        if (options.authHeaderXml) {
          client.addSoapHeader(
            options.authHeaderXml,
            '',
            options.namespacePrefix ?? 'tem',
            options.namespaceUri ?? 'http://tempuri.org/'
          );
        }
        resolve(client as GenericSoapClient);
      }
    );
  });
}

export async function invokeSoapOperation<TResponse = unknown>(
  client: GenericSoapClient,
  operationName: string,
  payload: Record<string, unknown>
): Promise<TResponse> {
  const operationCandidate = client?.[operationName];
  if (typeof operationCandidate !== 'function') {
    throw new Error(`SOAP client does not expose operation "${operationName}"`);
  }
  type SoapOperationFn = (
    args: Record<string, unknown>,
    callback: (err: unknown, result: TResponse) => void
  ) => void;
  const operation = operationCandidate as SoapOperationFn;
  return new Promise<TResponse>((resolve, reject) => {
    operation.call(client, payload, (err: unknown, result: TResponse) =>
      err ? reject(err) : resolve(result)
    );
  });
}

