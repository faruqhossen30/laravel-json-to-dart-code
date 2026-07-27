export interface JsonToDartOptions {
    rootClassName: string;
    nullable: boolean;
    copyWith: boolean;
}

interface DartProperty {
    name: string;
    type: string;
    isList: boolean;
}

export function generateDartClasses(jsonString: string, options: JsonToDartOptions): string {
    if (!jsonString.trim()) {
        return '';
    }

    try {
        const obj = JSON.parse(jsonString);
        if (typeof obj !== 'object' || obj === null) {
            return '// Input is not a valid JSON object or array';
        }
        
        const classes: Map<string, string> = new Map();
        
        const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const camelCase = (s: string) => s.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        
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
            
            const classCode = generateClassString(className, properties, options);
            classes.set(className, classCode);
        }
        
        if (Array.isArray(obj)) {
            if (obj.length > 0 && typeof obj[0] === 'object') {
                parseObject(options.rootClassName, obj[0]);
            } else {
                return '// Root JSON is an array of primitive types. No classes generated.';
            }
        } else {
            parseObject(options.rootClassName, obj);
        }
        
        return Array.from(classes.values()).join('\n\n');
        
    } catch (e: any) {
        return `// Error parsing JSON: ${e.message}`;
    }
}

function generateClassString(className: string, properties: DartProperty[], options: JsonToDartOptions): string {
    const q = options.nullable ? '?' : '';
    let code = `class ${className} {\n`;
    
    // Properties
    for (const prop of properties) {
        const typeStrRaw = prop.isList ? `List<${prop.type}>` : prop.type;
        const typeStr = typeStrRaw === 'dynamic' ? 'dynamic' : typeStrRaw + q;
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        code += `  ${typeStr} ${camelName};\n`;
    }
    
    code += `\n  ${className}({\n`;
    for (const prop of properties) {
        const req = options.nullable || prop.type === 'dynamic' ? '' : 'required ';
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        code += `    ${req}this.${camelName},\n`;
    }
    code += `  });\n\n`;
    
    // fromJson
    code += `  factory ${className}.fromJson(Map<string, dynamic> json) => ${className}(\n`;
    for (const prop of properties) {
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const isCustomObject = prop.type !== 'String' && prop.type !== 'int' && prop.type !== 'double' && prop.type !== 'bool' && prop.type !== 'dynamic';
        
        if (prop.isList && isCustomObject) {
            code += `    ${camelName}: json["${prop.name}"] == null ? ${options.nullable ? 'null' : '[]'} : List<${prop.type}>.from(json["${prop.name}"].map((x) => ${prop.type}.fromJson(x))),\n`;
        } else if (!prop.isList && isCustomObject) {
            code += `    ${camelName}: json["${prop.name}"] == null ? null : ${prop.type}.fromJson(json["${prop.name}"]),\n`;
        } else if (prop.isList) {
             code += `    ${camelName}: json["${prop.name}"] == null ? ${options.nullable ? 'null' : '[]'} : List<${prop.type}>.from(json["${prop.name}"].map((x) => x)),\n`;
        } else {
            code += `    ${camelName}: json["${prop.name}"],\n`;
        }
    }
    code += `  );\n\n`;
    
    // toJson
    code += `  Map<string, dynamic> toJson() => {\n`;
    for (const prop of properties) {
        const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        const isCustomObject = prop.type !== 'String' && prop.type !== 'int' && prop.type !== 'double' && prop.type !== 'bool' && prop.type !== 'dynamic';
        
        if (prop.isList && isCustomObject) {
             code += `    "${prop.name}": ${camelName} == null ? null : List<dynamic>.from(${camelName}${options.nullable ? '!' : ''}.map((x) => x.toJson())),\n`;
        } else if (!prop.isList && isCustomObject) {
            code += `    "${prop.name}": ${camelName}${options.nullable ? '?' : ''}.toJson(),\n`;
        } else if (prop.isList) {
             code += `    "${prop.name}": ${camelName} == null ? null : List<dynamic>.from(${camelName}${options.nullable ? '!' : ''}.map((x) => x)),\n`;
        } else {
            code += `    "${prop.name}": ${camelName},\n`;
        }
    }
    code += `  };\n`;
    
    // copyWith
    if (options.copyWith) {
        code += `\n  ${className} copyWith({\n`;
        for (const prop of properties) {
            const typeStrRaw = prop.isList ? `List<${prop.type}>` : prop.type;
            const paramType = typeStrRaw === 'dynamic' ? 'dynamic' : typeStrRaw + '?';
            const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            code += `    ${paramType} ${camelName},\n`;
        }
        code += `  }) {\n`;
        code += `    return ${className}(\n`;
        for (const prop of properties) {
            const camelName = prop.name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            code += `      ${camelName}: ${camelName} ?? this.${camelName},\n`;
        }
        code += `    );\n  }\n`;
    }
    
    code += `}\n`;
    return code;
}
