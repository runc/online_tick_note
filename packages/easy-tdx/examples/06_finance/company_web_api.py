"""财务快照与 F10 公司信息 — Web API 调用示例。

演示如何通过 HTTP 调用 easy-tdx 的 REST API 获取：
  1. GET /finance              — 最新财务快照（finance-info 对应）
  2. GET /company/category     — F10 板块目录（company-info 无板块名对应）
  3. GET /company/content      — F10 板块正文（company-info 有板块名对应）

前提：
    1. 启动 Web API 服务：easy-tdx serve --port 8000
    2. pip install requests

注意：与 CLI 的 company-info 不同，Web 层把「列目录」和「读正文」拆成两个端点
（面向程序，参数更显式）。读正文需要先调 /company/category 拿到 filename/offset/length，
再调 /company/content。

运行方式：
    python examples/06_finance/company_web_api.py
"""

from __future__ import annotations

import requests

BASE_URL = "http://localhost:8000/api/v1"
MARKET = "SH"
CODE = "600519"  # 贵州茅台


def fetch_finance() -> dict:
    """GET /finance — 最新财务快照（单期 37 字段）。

    Returns:
        {"data": [{...财务字段...}]}
    """
    resp = requests.get(f"{BASE_URL}/finance", params={"market": MARKET, "code": CODE}, timeout=15)
    resp.raise_for_status()
    return resp.json()


def fetch_company_category() -> dict:
    """GET /company/category — F10 板块目录。

    Returns:
        {"data": [{"name":..., "filename":..., "start":..., "length":...}, ...]}
    """
    resp = requests.get(
        f"{BASE_URL}/company/category", params={"market": MARKET, "code": CODE}, timeout=15
    )
    resp.raise_for_status()
    return resp.json()


def fetch_company_content(filename: str, offset: int = 0, length: int = 1024) -> str:
    """GET /company/content — F10 板块正文（GBK 文本）。

    Args:
        filename: 文件名（从 /company/category 的 filename 列获取，如 "600519.txt"）
        offset: 内容起始偏移（字节）
        length: 读取长度（字节）

    Returns:
        板块正文文本
    """
    resp = requests.get(
        f"{BASE_URL}/company/content",
        params={
            "market": MARKET,
            "code": CODE,
            "filename": filename,
            "offset": offset,
            "length": length,
        },
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()["content"]


def find_section(categories: dict, section_name: str) -> dict | None:
    """从目录结果中按板块名查找条目（name/filename/start/length）。"""
    for row in categories.get("data", []):
        if row["name"] == section_name:
            return row
    return None


# --------------------------------------------------------------------------- #
# 演示主流程
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    print("=" * 60)
    print(f"1. 最新财务快照 GET /finance（{CODE}）")
    print("=" * 60)
    finance = fetch_finance()
    data = finance["data"][0]
    print(f"  总股本: {data['zong_guben']:.0f} 万股")
    print(f"  净利润: {data['jing_lirun']:.2e} 元")
    print(f"  每股净资产: {data['meigujing_zichan']:.4f} 元")
    print(f"  更新日期: {data['updated_date']}")

    print("\n" + "=" * 60)
    print(f"2. F10 板块目录 GET /company/category（{CODE}）")
    print("=" * 60)
    categories = fetch_company_category()
    for row in categories["data"]:
        print(f"  {row['name']:<6} {row['filename']}  (offset={row['start']}, len={row['length']})")

    print("\n" + "=" * 60)
    print("3. F10 板块正文 GET /company/content")
    print("=" * 60)

    # 读正文是两步：先从目录查 filename/offset/length，再调 content
    section = find_section(categories, "公司概况")
    if section:
        print(
            f"\n--- 3.1 公司概况（filename={section['filename']}, "
            f"offset={section['start']}, length={section['length']}）---"
        )
        content = fetch_company_content(
            section["filename"], section["start"], min(section["length"], 1024)
        )
        print(content[:500])  # 只打印前 500 字
    else:
        print("未找到「公司概况」板块")

    # 也可只读某板块前 N 字节（用 start + 自定义 length）
    section2 = find_section(categories, "股本结构")
    if section2:
        print(f"\n--- 3.2 股本结构（length={section2['length']}，全量读取）---")
        content2 = fetch_company_content(
            section2["filename"], section2["start"], section2["length"]
        )
        print(content2)
