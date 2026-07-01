"""演示：获取公司信息目录与各个分类的详细内容。

使用 TdxClient 标准协议客户端，分两步获取公司信息：
  1. get_company_info_category() -- 获取公司信息目录（分类列表）
  2. get_company_info_content() -- 根据目录中的 filename/start/length 读取具体内容

get_company_info_category() 返回 CompanyInfoCategory DataFrame，列说明:
  name      str     分类名称（如"最新提示"、"公司概况"、"财务分析"等）
  filename  str     内容文件名（如 "600519.txt"）
  start     int     内容在该文件中的起始偏移（字节）
  length    int     内容长度（字节）

公司信息常见分类（实测，以个股为准可能略有差异）:
  最新提示、公司概况、财务分析、股本结构、股东研究、资本运作、
  业内点评、行业分析、公司大事、研究报告、经营分析、主力追踪、
  分红扩股、高层治理、龙虎榜单、关联个股

数据特点:
  - 目录中每个分类对应同一 .txt 文件的不同偏移位置
  - 内容为纯文本，长度从几百字节到数万字节不等
  - 内容更新频率取决于上市公司公告发布节奏
"""

from easy_tdx import Market, TdxClient

CODE = "600519"
NAME = "贵州茅台"
MARKET = Market.SH

# 要展示的分类，按需注释/取消注释
SHOW_CATEGORIES = [
    "最新提示",
    "公司概况",
    "财务分析",
    "股本结构",
    "股东研究",
    "资本运作",
    "业内点评",
    "行业分析",
    "公司大事",
    "研究报告",
    "经营分析",
    "主力追踪",
    "分红扩股",
    "高层治理",
    "龙虎榜单",
    "关联个股",
]


def show_category_content(client, categories, category_name, max_chars=500):
    """获取并展示指定分类的内容。"""
    row = categories[categories["name"] == category_name]
    if row.empty:
        print(f"  未找到分类: {category_name}")
        return

    r = row.iloc[0]
    content = client.get_company_info_content(
        MARKET, CODE, r["filename"], int(r["start"]), int(r["length"])
    )
    text = content.strip()
    if len(text) > max_chars:
        text = text[:max_chars] + f"\n... (共 {len(content.strip())} 字，仅显示前 {max_chars} 字)"
    print(f"\n{'=' * 60}")
    print(f"【{r['name']}】 (共 {r['length']} 字节)")
    print(f"{'=' * 60}")
    print(text)


with TdxClient.from_best_host() as c:
    categories = c.get_company_info_category(MARKET, CODE)

    # 1. 显示目录
    print(f"{NAME} 公司信息目录:")
    print(categories.to_string(index=False))

    # 2. 显示所有分类内容（每个分类默认只显示前500字）
    for name in SHOW_CATEGORIES:
        show_category_content(c, categories, name)

    # 3. 也可以单独获取某个分类的完整内容，例如：
    # show_category_content(c, categories, "公司概况", max_chars=99999)

# 运行结果（板块名以实际为准，个股可能略有差异）:
# 贵州茅台 公司信息目录:
#        name    filename    start   length
#     最新提示 600519.txt       0    12145
#     公司概况 600519.txt   12145    12540
#     财务分析 600519.txt   24685    36381
#     股东研究 600519.txt   61066    25101
#     股本结构 600519.txt   86167     3955
#     资本运作 600519.txt   90122    13049
#     业内点评 600519.txt  103171    69451
#     行业分析 600519.txt  172622    16222
#     公司大事 600519.txt  188844   357274
#     研究报告 600519.txt  546118    69776
#     经营分析 600519.txt  615894    22709
#     主力追踪 600519.txt  638603    27913
#     分红扩股 600519.txt  666516    47420
#     高层治理 600519.txt  713936    19145
#     龙虎榜单 600519.txt  756387    25090
#     关联个股 600519.txt  733081    23306
