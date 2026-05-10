import re

# Lire le fichier
with open('inua_db_backup.sql', 'r', encoding='utf-8') as f:
    content = f.read()

# Fonction pour convertir COPY en INSERT
def convert_copy_to_insert(match):
    # Extraire le nom de la table et les colonnes
    copy_line = match.group(1)
    data_lines = match.group(2).strip().split('\n')
    
    # Parser la ligne COPY pour obtenir table et colonnes
    # Format: COPY public.table_name (col1, col2...) FROM stdin;
    parts = copy_line.replace('COPY ', '').replace(' FROM stdin;', '').split('(')
    table = parts[0].strip()
    columns = parts[1].replace(')', '').strip()
    
    # Générer les INSERT
    inserts = []
    for line in data_lines:
        if line.strip() and not line.startswith('\\.'):
            values = line.split('\t')
            formatted_values = []
            for v in values:
                if v == '\\N' or v == '':
                    formatted_values.append('NULL')
                elif v.isdigit():
                    formatted_values.append(v)
                else:
                    formatted_values.append(f"'{v.replace(\"'\", \"''\")}'")
            inserts.append(f"INSERT INTO {table} ({columns}) VALUES ({', '.join(formatted_values)});")
    
    return '\n'.join(inserts)

# Pattern pour matcher COPY ... FROM stdin; avec les données
pattern = r'COPY\s+([^\n]+)\s+FROM\s+stdin;\n(.*?)\\\.'
content = re.sub(pattern, convert_copy_to_insert, content, flags=re.DOTALL)

# Supprimer la ligne \unrestrict à la fin
content = re.sub(r'\\unrestrict\s+\w+', '', content)

# Sauvegarder
with open('inua_db_backup_fixed.sql', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Fichier corrigé: inua_db_backup_fixed.sql")
