export interface JsonToDartOptions {
    rootClassName: string;
    nullable: boolean; // global nullable
    copyWith: boolean;
}

export interface DartProperty {
    name: string;
    type: string;
    isList: boolean;
    isNullable?: boolean; // manual override
}

export interface DartClass {
    className: string;
    properties: DartProperty[];
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const camelCase = (s: string) => s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());

export function parseJsonToAst(jsonString: string, rootClassName: string): DartClass[] {
    if (!jsonString.trim()) {
        return [];
    }
    
    const obj = JSON.parse(jsonString);
    if (typeof obj !== 'object' || obj === null) {
        throw new Error('Input is not a valid JSON object or array');
    }
    
    const classes: Map<string, DartClass> = new Map();
    
    function parseObject(className: string, data: any) {
        const properties: DartProperty[] = [];
        
        for (const key in data) {
            const value = data[key];
            const propName = camelCase(key);
            let propType = 'dynamic';
            let isList = false;
            
            if (value === null) {
                propType = 'dynamic';
            } else if (typeof value === 'boolean') {
                propType = 'bool';
            } else if (typeof value === 'number') {
                propType = Number.isInteger(value) ? 'int' : 'double';
            } else if (typeof value === 'string') {
                propType = 'String';
            } else if (Array.isArray(value)) {
                isList = true;
                if (value.length > 0) {
                    const first = value[0];
                    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
                        const nestedClassName = capitalize(propName);
                        propType = nestedClassName;
                        parseObject(nestedClassName, first);
                    } else if (typeof first === 'string') {
                        propType = 'String';
                    } else if (typeof first === 'number') {
                        propType = Number.isInteger(first) ? 'int' : 'double';
                    } else if (typeof first === 'boolean') {
                        propType = 'bool';
                    } else {
                        propType = 'dynamic';
                    }
                } else {
                    propType = 'dynamic';
                }
            } else if (typeof value === 'object') {
                const nestedClassName = capitalize(propName);
                propType = nestedClassName;
                parseObject(nestedClassName, value);
            }
            
            properties.push({
                name: key, 
                type: propType,
                isList: isList
            });
        }
        
        classes.set(className, { className, properties });
    }
    
    if (Array.isArray(obj)) {
        if (obj.length > 0 && typeof obj[0] === 'object') {
            parseObject(rootClassName || 'Root', obj[0]);
        } else {
            throw new Error('Root JSON is an array of primitive types. No classes generated.');
        }
    } else {
        parseObject(rootClassName || 'Root', obj);
    }
    
    return Array.from(classes.values());
}

export function generateCodeFromAst(classes: DartClass[], options: JsonToDartOptions): string {
    if (classes.length === 0) return '';
    return classes.map(cls => generateClassString(cls, options)).join('\n\n');
}

function generateClassString(dartClass: DartClass, options: JsonToDartOptions): string {
    let code = `class ${dartClass.className} {\n`;
    
    // Properties
    for (const prop of dartClass.properties) {
        const isNullable = prop.isNullable !== undefined ? prop.isNullable : options.nullable;
        const q = isNullable ? '?' : '';
        const typeStrRaw = prop.isList ? `List<${prop.type}>` : prop.type;
        const typeStr = typeStrRaw === 'dynamic' ? 'dynamic' : typeStrRaw + q;
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        code += `  ${typeStr} ${camelName};\n`;
    }
    
    code += `\n  ${dartClass.className}({\n`;
    for (const prop of dartClass.properties) {
        const isNullable = prop.isNullable !== undefined ? prop.isNullable : options.nullable;
        const req = isNullable || prop.type === 'dynamic' ? '' : 'required ';
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        code += `    ${req}this.${camelName},\n`;
    }
    code += `  });\n\n`;
    
    // fromJson
    code += `  factory ${dartClass.className}.fromJson(Map<string, dynamic> json) => ${dartClass.className}(\n`;
    for (const prop of dartClass.properties) {
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const isCustomObject = prop.type !== 'String' && prop.type !== 'int' && prop.type !== 'double' && prop.type !== 'bool' && prop.type !== 'dynamic';
        const isNullable = prop.isNullable !== undefined ? prop.isNullable : options.nullable;
        
        if (prop.isList && isCustomObject) {
            code += `    ${camelName}: json["${prop.name}"] == null ? ${isNullable ? 'null' : '[]'} : List<${prop.type}>.from(json["${prop.name}"].map((x) => ${prop.type}.fromJson(x))),\n`;
        } else if (!prop.isList && isCustomObject) {
            code += `    ${camelName}: json["${prop.name}"] == null ? null : ${prop.type}.fromJson(json["${prop.name}"]),\n`;
        } else if (prop.isList) {
             code += `    ${camelName}: json["${prop.name}"] == null ? ${isNullable ? 'null' : '[]'} : List<${prop.type}>.from(json["${prop.name}"].map((x) => x)),\n`;
        } else {
            code += `    ${camelName}: json["${prop.name}"],\n`;
        }
    }
    code += `  );\n\n`;
    
    // toJson
    code += `  Map<string, dynamic> toJson() => {\n`;
    for (const prop of dartClass.properties) {
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const isCustomObject = prop.type !== 'String' && prop.type !== 'int' && prop.type !== 'double' && prop.type !== 'bool' && prop.type !== 'dynamic';
        const isNullable = prop.isNullable !== undefined ? prop.isNullable : options.nullable;
        
        if (prop.isList && isCustomObject) {
             code += `    "${prop.name}": ${camelName} == null ? null : List<dynamic>.from(${camelName}${isNullable ? '!' : ''}.map((x) => x.toJson())),\n`;
        } else if (!prop.isList && isCustomObject) {
            code += `    "${prop.name}": ${camelName}${isNullable ? '?' : ''}.toJson(),\n`;
        } else if (prop.isList) {
             code += `    "${prop.name}": ${camelName} == null ? null : List<dynamic>.from(${camelName}${isNullable ? '!' : ''}.map((x) => x)),\n`;
        } else {
            code += `    "${prop.name}": ${camelName},\n`;
        }
    }
    code += `  };\n`;
    
    // copyWith
    if (options.copyWith) {
        code += `\n  ${dartClass.className} copyWith({\n`;
        for (const prop of dartClass.properties) {
            const typeStrRaw = prop.isList ? `List<${prop.type}>` : prop.type;
            const paramType = typeStrRaw === 'dynamic' ? 'dynamic' : typeStrRaw + '?';
            const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            code += `    ${paramType} ${camelName},\n`;
        }
        code += `  }) {\n`;
        code += `    return ${dartClass.className}(\n`;
        for (const prop of dartClass.properties) {
            const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            code += `      ${camelName}: ${camelName} ?? this.${camelName},\n`;
        }
        code += `    );\n  }\n`;
    }
    
    code += `}\n`;
    return code;
}
