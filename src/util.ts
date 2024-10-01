export const responseLine = (lhs: string, rhs: string) => {
    return `${lhs}: <b>${rhs}</b>`
}

export const env =
    (env_name: string) => {
        const env_value = process.env[env_name];
        
        return env_value === undefined
            ? (() => { throw new Error(`no ${env_name} env variable set`) })()
            : env_value!;
    };

export const formData: (values: Record<string, string>) => FormData =
    (values: Record<string, string>) => {
        const form = new FormData();

        for (const [key, value] of Object.entries(values)) {
            form.append(key, value)
        }

        return form
    };

