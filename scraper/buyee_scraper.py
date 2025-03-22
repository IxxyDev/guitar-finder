import requests
from bs4 import BeautifulSoup
import json
import os
from datetime import datetime, timedelta
import time
import re

def get_item_details(url):
    """Получает детальную информацию о товаре со страницы лота"""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    try:
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return None, None

        soup = BeautifulSoup(response.text, 'html.parser')

        if url.endswith('c1177976606'):
            with open("detail_page.html", "w", encoding="utf-8") as f:
                f.write(response.text)

        detail_data = soup.find(id="itemDetail_data")

        condition = None
        closing_time = None

        if detail_data:
            list_items = detail_data.find_all('li')

            condition_texts = ["Item Condition", "Состояние товара"]
            closing_time_texts = ["Closing Time", "Время закрытия"]

            for i, li in enumerate(list_items):
                em_elem = li.find('em')
                if em_elem:
                    em_text = em_elem.text.strip()

                    is_condition = any(cond_text in em_text for cond_text in condition_texts)
                    if is_condition:
                        span_elem = li.find('span')
                        if span_elem:
                            condition = span_elem.text.strip()

                    is_closing_time = any(time_text in em_text for time_text in closing_time_texts)
                    if is_closing_time:
                        span_elem = li.find('span')
                        if span_elem:
                            closing_time = span_elem.text.strip()
        else:
            ul_elements = soup.find_all('ul')
            for ul in ul_elements:
                li_elements_with_em = ul.find_all('li', lambda tag: tag.find('em') is not None)
                if not li_elements_with_em:
                    continue

                for li in li_elements_with_em:
                    em_elem = li.find('em')
                    if not em_elem:
                        continue

                    em_text = em_elem.text.strip()

                    is_condition = any(cond_text in em_text for cond_text in ["Item Condition", "Состояние товара"])
                    if is_condition and not condition:
                        span_elem = li.find('span')
                        if span_elem:
                            condition = span_elem.text.strip()

                    is_closing_time = any(time_text in em_text for time_text in ["Closing Time", "Время закрытия"])
                    if is_closing_time and not closing_time:
                        span_elem = li.find('span')
                        if span_elem:
                            closing_time = span_elem.text.strip()

        return condition, closing_time

    except Exception as e:
        return None, None

def scrape_buyee(max_pages=5, fetch_details=True, max_items=None):
    guitars = []
    base_url = "https://buyee.jp/item/search/category/2084019019"
    params = {"goodSellers": "1"}

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
    }

    processed_items = 0

    for page in range(1, max_pages + 1):
        try:
            if page > 1:
                params["page"] = page

            response = requests.get(base_url, params=params, headers=headers)

            if response.status_code != 200:
                continue

            soup = BeautifulSoup(response.text, 'html.parser')

            guitar_items = soup.select('.itemCard')

            if not guitar_items:
                break

            for item in guitar_items:
                try:
                    title_elem = item.select_one('.itemCard__itemName a')
                    title = title_elem.text.strip() if title_elem else "Название не найдено"

                    url = title_elem['href'] if title_elem and 'href' in title_elem.attrs else ""

                    if url and not url.startswith('http'):
                        url = f"https://buyee.jp{url}"

                    price = "Цена не указана"

                    price_outer = item.select_one('.g-price__outer')
                    if price_outer:
                        price_yen_elem = price_outer.select_one('.g-price')
                        price_yen = price_yen_elem.text.strip() if price_yen_elem else ""

                        price_rub_elem = price_outer.select_one('.g-priceFx')
                        price_rub = price_rub_elem.text.strip() if price_rub_elem else ""

                        if price_yen and price_rub:
                            price = f"{price_yen} {price_rub}"
                        elif price_yen:
                            price = price_yen
                        elif price_rub:
                            price = price_rub

                    if price == "Цена не указана":
                        price_elem = item.select_one('.g-price')
                        if price_elem:
                            price = price_elem.text.strip()

                    thumbnail = item.select_one('.g-thumbnail')
                    img_url = ""
                    if thumbnail:
                        img_elem = thumbnail.select_one('img')
                        if img_elem and 'src' in img_elem.attrs:
                            img_url = img_elem['src']

                    end_date = "Не указано"
                    condition = None
                    time_remaining_str = None

                    if fetch_details and url:
                        condition, detailed_closing_time = get_item_details(url)

                        if detailed_closing_time:
                            try:
                                dt = datetime.strptime(detailed_closing_time, "%d %b %Y %H:%M:%S")
                                end_date = dt.strftime("%d.%m.%Y %H:%M")

                                now = datetime.now()
                                time_remaining = dt - now

                                if time_remaining.total_seconds() > 0:
                                    days = time_remaining.days
                                    hours = time_remaining.seconds // 3600
                                    minutes = (time_remaining.seconds % 3600) // 60

                                    remaining_text = "Осталось: "
                                    if days > 0:
                                        remaining_text += f"{days} дн. "
                                    if hours > 0 or days > 0:
                                        remaining_text += f"{hours} ч. "
                                    remaining_text += f"{minutes} мин."

                                    time_remaining_str = remaining_text
                                else:
                                    time_remaining_str = "Торги завершены"
                            except Exception as e:
                                end_date = detailed_closing_time
                                time_remaining_str = "Не определено"
                        else:
                            time_remaining_str = "Не определено"

                        time.sleep(1)

                    guitars.append({
                        "title": title,
                        "price": price,
                        "image": img_url,
                        "url": url,
                        "source": "buyee",
                        "condition": condition,
                        "endDate": end_date,
                        "timeRemaining": time_remaining_str if 'time_remaining_str' in locals() else "Не определено"
                    })

                    processed_items += 1
                    if max_items and processed_items >= max_items:
                        return guitars

                except Exception as e:
                    pass

            next_page = soup.select_one('.pager_btn-next')
            if not next_page or 'disabled' in next_page.attrs.get('class', []):
                break

            time.sleep(2)

        except Exception as e:
            pass

    return guitars

if __name__ == "__main__":
    data_dir = "../data"
    os.makedirs(data_dir, exist_ok=True)

    guitars = scrape_buyee(max_pages=2, fetch_details=True)

    with open(f"{data_dir}/buyee_guitars.json", "w", encoding="utf-8") as f:
        json.dump(guitars, f, ensure_ascii=False, indent=2)