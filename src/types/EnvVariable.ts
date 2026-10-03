export enum Requirement {
    REQUIRED = "required",
    OPTIONAL = "optional"
}

export type EnvVariable = {
    name: string;
    requirement: Requirement;
    defaultValue: string | undefined;
    envReference : EnvReference[]
};

export type EnvReference = {
    fileName: string;
    line: number; 
} 