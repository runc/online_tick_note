#!/bin/bash
# easy-tdx 财务快照与 F10 公司信息 — CLI 使用示例
#
# 三条命令：
#   finance-info   — 最新财务快照（37 字段单期指标）
#   company-info   — F10 板块目录（无板块名）/ 板块正文（有板块名）
#
# 与 f10（新浪三表）的区别：f10 返回多期利润表/负债表/现金流；
# 本组命令走通达信协议，finance-info 是单期快照，company-info 是 F10 全文板块。
#
# 用法：去掉命令前的 # 即可实际执行。

CODE=600519      # 贵州茅台
MARKET=SH

echo "================================================================"
echo "1. finance-info — 最新财务快照（表格输出）"
echo "================================================================"
# easy-tdx finance-info $MARKET $CODE --table

echo ""
echo "================================================================"
echo "2. company-info 无板块名 — 列出 F10 板块目录"
echo "================================================================"
# easy-tdx company-info $MARKET $CODE --table

echo ""
echo "================================================================"
echo "3. company-info \"板块名\" — 读取 F10 板块正文"
echo "================================================================"

echo "--- 3.1 公司概况 ---"
# easy-tdx company-info $MARKET $CODE "公司概况"

echo ""
echo "--- 3.2 股本结构（板块较短，默认 1024 字节即可读全）---"
# easy-tdx company-info $MARKET $CODE "股本结构"

echo ""
echo "--- 3.3 分红扩股（加长读取）---"
# easy-tdx company-info $MARKET $CODE "分红扩股" --length 4096

echo ""
echo "--- 3.4 龙虎榜单 ---"
# easy-tdx company-info $MARKET $CODE "龙虎榜单"

echo ""
echo "================================================================"
echo "4. 输出格式切换（JSON / CSV）"
echo "================================================================"
echo "--- 4.1 财务快照 JSON（默认，适合 Agent 解析）---"
# easy-tdx finance-info $MARKET $CODE --output json

echo ""
echo "--- 4.2 板块目录 CSV ---"
# easy-tdx company-info $MARKET $CODE --output csv

echo ""
echo "================================================================"
echo "5. 直接传文件名读正文（高级用法）"
echo "================================================================"
echo "# filename 从「company-info 列目录」结果获取；offset 为文件绝对偏移"
# easy-tdx company-info $MARKET $CODE ${CODE}.txt --offset 0 --length 2048

echo ""
echo "================================================================"
echo "6. 错误处理：板块名不存在时提示可用板块"
echo "================================================================"
# easy-tdx company-info $MARKET $CODE "不存在的板块"
