import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime

def scrape_reverb():
    guitars = []
    base_url = "https://reverb.com/marketplace?product_type=electric-guitars"

    try:
        response = requests.get(base_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        soup = BeautifulSoup(response.text, 'html.parser')

        guitar_items = soup.select('.grid-card')

        for item in guitar_items:
            try:
                title = item.select_one('.grid-card__title').text.strip()
                price = item.select_one('.price__amount').text.strip()
                img = item.select_one('img')['src'] if item.select_one('img') else ""
                url = "https://reverb.com" + item.select_one('a')['href'] if item.select_one('a') else ""

                guitars.append({
                    "title": title,
                    "price": price,
                    "image": img,
                    "url": url,
                    "source": "reverb"
                })
            except Exception as e:
                pass
    except Exception as e:
        pass

    return guitars

if __name__ == "__main__":
    data_dir = "../data"
    os.makedirs(data_dir, exist_ok=True)

    guitars = scrape_reverb()

    with open(f"{data_dir}/reverb_guitars.json", "w", encoding="utf-8") as f:
        json.dump(guitars, f, ensure_ascii=False, indent=2)

    print(f"Данные сохранены в {data_dir}/reverb_guitars.json")