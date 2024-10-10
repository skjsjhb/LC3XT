import type { AssembleException } from "../loli/exceptions";
import type { RuntimeException } from "../sugar/exceptions";

export default {
    translation: {
        cli: {
            loli: {
                locale: "侦测到的语言为 {{lang}}",
                "no-source":
                    "没有指定源文件，如果您打算从标准输入读入源代码，请加上 --stdin 选项",
                "output-stdin": "要将输出定向到文件，请加上 --out 选项",
                help:
                    "用法：loli [选项] [源文件]\n\n" +
                    "LC3XT Loli 诊断汇编器\n\n" +
                    "选项\n\n" +
                    "-h, --help            输出帮助信息\n" +
                    "-v, --version         输出版本信息\n" +
                    "-l, --lang ...        显式设置语言\n" +
                    "-o, --out ...         将生成的程序定向到文件\n" +
                    "-g, --debug ...       生成调试信息并输出到文件\n" +
                    "\n" +
                    "--stdin               从标准输入读入源代码",

                "source-read": "源代码读入完毕",
                assemble: "正在汇编和生成代码",
                debug: "正在生成调试信息",
                "no-error": "静态检查完毕，未发现错误或警告",
                warn: "汇编过程中发现了警告，建议修正代码后重新汇编",
                "done-binary": "二进制代码生成完毕，总计 {{count}} 个程序段",
                "has-warn": "在第 {{lineNo}} 行发现警告：{{msg}}",
                "has-error": "在第 {{lineNo}} 行发现错误：{{msg}}",
                error: "侦测到不可恢复错误，请先修正代码再尝试汇编",
                "writing-file": "正在写入文件 {{file}}",
            },
            sugar: {
                locale: "侦测到的语言为 {{lang}}",
                "no-source":
                    "没有指定二进制文件，如果您打算从标准输入读入代码，请加上 --stdin 选项",
                help:
                    "用法：sugar [选项] [二进制文件]\n\n" +
                    "LC3XT Sugar 动态虚拟机\n\n" +
                    "选项\n\n" +
                    "-h, --help            输出帮助信息\n" +
                    "-v, --version         输出版本信息\n" +
                    "-l, --lang ...        显式设置语言\n" +
                    "-g, --debug ...       为程序附加调试信息\n" +
                    "-c, --limit ...       设置指令数限制\n" +
                    "\n" +
                    "-b, --boot ...        指定起始地址\n" +
                    "-s, --strict          不忽略任何警告，将其按错误报告\n" +
                    "                      对于用户程序，使用 0x3000\n" +
                    "                      对于系统程序，使用 0x0200\n" +
                    "\n" +
                    // "-i, --interactive     在交互模式下运行\n" +
                    // "                      开放键盘中断，输出会实时显示\n" +
                    // "                      并且程序可以在运行时读取输入\n" +
                    // "\n" +
                    "--stdin               从标准输入读入二进制代码",
                "source-read": "二进制代码读入完毕",
                "loaded-debug-bundle": "已装载调试信息",
                "invalid-boot": "无效的启动地址：{{boot}}",
                "boot-at": "程序将从 {{boot}} 启动",
                "invalid-bin-line": "无法识别二进制代码：{{content}}",
                "program-loaded": "装载了 {{count}} 个程序段",
                "vm-strict": "虚拟机已配置为严格模式",
                "vm-start": "已启动虚拟机",
                "vm-exit-ok": "虚拟机正常关闭",
                "vm-exit-error": "虚拟机未正常关闭",
                "vm-output": "程序的输出如下",
                "no-debug-bundle":
                    "若要获得更详细的消息，请用 --debug 附加二进制文件的调试信息",
            },
        },
        exception: {
            asm: {
                "unsupported-escape": "无法转义字符串 {{str}}",
                "missing-args": "指令 {{op}} 缺少参数",
                "unmatched-argc":
                    "指令 {{op}} 需要 {{expected}} 个参数，但只找到了 {{found}} 个",
                "suspicious-label-possibly-args":
                    "{{content}} 看上去不像一个标签（似乎缺少了指令）",
                "suspicious-label-possibly-op":
                    "{{content}} 看上去不像一个标签（似乎拼错了 {{op}}）",
                "implicit-located-label":
                    "无法确定 {{label}} 的地址，推算为 {{address}}",
                "not-register": "{{candidate}} 不是一个寄存器",
                "not-immediate": "{{candidate}} 不是一个立即数",
                "not-label": "标签 {{candidate}} 不存在",
                "duplicated-label": "指令 {{op}} 有重复的标签 {{labels}}",
                "implicit-number":
                    "立即数 {{candidate}} 缺少前缀，推断为 {{base}} 进制",
                "negative-blk":
                    "以 BLKW 填充的数目应当是正数，但是发现了 {{candidate}}",
                "suspicious-string":
                    "STRINGZ 填充时发现了空字符串，索引 {{index}}",
                "blkw-without-label": "以 BLKW 填充的地址 {{address}} 没有标签",
                "fill-without-label": "以 FILL 填充的地址 {{address}} 没有标签",
                "string-without-label":
                    "以 STRINGZ 填充的地址 {{address}} 没有标签",
                "origin-redefined":
                    "在已经定义起始地址的区段内重新定义起始地址",
                "redundant-end": "在区段外重复声明区段结束",
                "instr-outside-section": "指令不在任何区段内，将使用先前地址",
                "number-bits-overflow": "数字 {{num}} 无法被编码成 {{bits}} 位",
                "empty-program": "装载点位于 {{address}} 的程序段为空",
                "negative-trap":
                    "陷阱向量是无符号数，但是发现了 {{vec}}，将按其补码编码",
                "label-redefined": "标签 {{label}} 已经定义过了",
                "no-halt": "程序没有 HALT 指令，将不会正常终止",
            } satisfies Record<AssembleException, string>,

            rt: {
                "unloaded-memory": "要读取的内存地址 {{address}} 尚未初始化",
                "data-execution":
                    "当前指令指针 {{address}} 中的内容 {{content}} 似乎是数据而非指令",
                "address-out-of-range": "地址 {{address}} 不存在",
                "memory-permission-denied":
                    "不能在用户模式下访问系统内存地址 {{address}}",
                "mmio-no-device": "映射 I/O 地址 {{address}} 没有连接设备",
                "instr-permission-denied":
                    "不能在用户模式下执行位于 {{address}} 的 RTI 指令",
                "device-user-access":
                    "通常不会在用户模式下访问映射 I/O 地址 {{address}}",
                "invalid-instruction":
                    "无法识别 {{address}} 处的指令 {{instr}}",
                "interrupt-unhandled": "中断 {{vec}} 没有注册处理程序",
                "suspicious-empty-branch":
                    "{{address}} 处的 BR 指令 {{instr}} 没有条件码",
                "suspicious-system-stack":
                    "系统栈地址 {{address}} 不应位于用户空间或映射 I/O 区域中",
                "suspicious-user-stack":
                    "用户栈地址 {{address}} 不应位于系统空间或映射 I/O 区域中",
                "possible-stack-underflow":
                    "栈顶指针位置异常，应当在 {{expected}} 以下，但当前值是 {{address}}",
            } satisfies Record<RuntimeException, string>,
        },

        debug: {
            "source-pos": "（请检查源代码第 {{line}} 行）",
        },

        nya: {},
    },
};
