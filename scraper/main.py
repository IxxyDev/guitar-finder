import os
import json
import shutil
import sys
import pathlib
import argparse
from datetime import datetime
from reverb_scraper import scrape_reverb
from buyee_scraper import scrape_buyee

def main():
    parser = argparse.ArgumentParser(description='Скрапер гитар с Buyee.jp и Reverb.com')
    parser.add_argument('--test', action='store_true', help='Запуск в тестовом режиме с ограниченным количеством товаров')
    args = parser.parse_args()

    script_dir = pathlib.Path(__file__).parent.absolute()
    project_root = script_dir.parent

    data_dir = script_dir / "data"
    web_data_dir = project_root / "web" / "data"

    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(web_data_dir, exist_ok=True)

    reverb_guitars = scrape_reverb()

    if args.test:
        buyee_guitars = scrape_buyee(fetch_details=True, max_pages=1, max_items=5)
    else:
        buyee_guitars = scrape_buyee(fetch_details=True, max_pages=100, max_items=None)

    all_guitars = reverb_guitars + buyee_guitars

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    combined_data = {
        "guitars": all_guitars,
        "last_updated": timestamp,
        "total_count": len(all_guitars)
    }

    all_guitars_path = data_dir / "all_guitars.json"
    with open(all_guitars_path, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, ensure_ascii=False, indent=2)

    if os.path.exists(web_data_dir):
        web_file_path = web_data_dir / "guitars.json"
        shutil.copy(all_guitars_path, web_file_path)

if __name__ == "__main__":
    main()