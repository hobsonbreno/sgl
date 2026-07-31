import os
import glob
import re

for filepath in glob.glob('frontend/src/**/*.tsx', recursive=True):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Replace 'http://localhost:7005/...' with `${window.API_URL}/...`
    # Match single quote
    content = re.sub(r"'http://localhost:7005([^']*)'", r"`${window.API_URL}\1`", content)
    # Match double quote (just in case)
    content = re.sub(r'"http://localhost:7005([^"]*)"', r"`${window.API_URL}\1`", content)
    # Match backtick (already a template literal)
    content = re.sub(r"`http://localhost:7005([^`]*)`", r"`${window.API_URL}\1`", content)
    
    # Same for 7010
    content = re.sub(r"'http://localhost:7010([^']*)'", r"`${window.MARKET_URL}\1`", content)
    content = re.sub(r'"http://localhost:7010([^"]*)"', r"`${window.MARKET_URL}\1`", content)
    content = re.sub(r"`http://localhost:7010([^`]*)`", r"`${window.MARKET_URL}\1`", content)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")
