import os
import json
import shutil
from datetime import datetime
from reverb_scraper import scrape_reverb
from buyee_scraper import scrape_buyee
import sys
import pathlib

def main():
    print("Запуск скрапинга гитар...")

    # Получаем абсолютный путь к корню проекта
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)

    print(f"Директория скрипта: {script_dir}")
    print(f"Корень проекта: {project_root}")

    # Устанавливаем абсолютные пути к директориям
    data_dir = os.path.join(script_dir, "data")  # Директория для внутренних данных
    web_data_dir = os.path.join(project_root, "web", "data")  # Директория для веб-данных

    print(f"Директория данных: {data_dir}")
    print(f"Директория веб-данных: {web_data_dir}")

    # Создание директорий, если они не существуют
    os.makedirs(data_dir, exist_ok=True)
    os.makedirs(web_data_dir, exist_ok=True)

    # Запуск скраперов
    reverb_guitars = scrape_reverb()
    buyee_guitars = scrape_buyee()

    # Объединение данных
    all_guitars = reverb_guitars + buyee_guitars

    # Добавление временной метки
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    combined_data = {
        "guitars": all_guitars,
        "last_updated": timestamp,
        "total_count": len(all_guitars)
    }

    # Сохранение объединенных данных в директорию data
    data_file_path = os.path.join(data_dir, "all_guitars.json")
    with open(data_file_path, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, ensure_ascii=False, indent=2)

    print(f"Сохранено всего {len(all_guitars)} гитар в {data_file_path}")

    # Копирование данных в web-директорию для статического сайта
    # Проверка существования директории web/data перед копированием
    if os.path.exists(web_data_dir):
        web_file_path = os.path.join(web_data_dir, "guitars.json")
        shutil.copy(data_file_path, web_file_path)
        print(f"Данные скопированы в {web_file_path} для веб-сайта")

        # Проверка, что файл действительно скопирован и доступен
        if os.path.exists(web_file_path):
            print(f"Файл {web_file_path} успешно создан, размер: {os.path.getsize(web_file_path)} байт")

            # Проверка содержимого файла
            try:
                with open(web_file_path, "r", encoding="utf-8") as f:
                    test_data = json.load(f)
                    print(f"Файл содержит {len(test_data.get('guitars', []))} записей о гитарах")
            except Exception as e:
                print(f"Ошибка при проверке содержимого файла: {e}")
    else:
        print(f"Ошибка: директория {web_data_dir} не существует")

    # Дополнительная проверка для отладки
    print("\nПоиск файлов с данными:")
    os.system(f"find {project_root} -name guitars.json -type f")

if __name__ == "__main__":
    main()