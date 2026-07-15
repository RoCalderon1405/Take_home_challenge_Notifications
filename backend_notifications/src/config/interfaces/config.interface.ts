export interface ConfigProps {
    port:number,
    api: ApiconfigProps
}

interface ApiconfigProps {
    apiUrl: string,
    httpTimeout: number,
}