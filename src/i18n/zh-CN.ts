export default {
    translation: {
        cli: {
            locale: "侦测到的语言为 {{lang}}",
            "no-source":
                "没有指定源文件，如果您打算从标准输入读入源代码，请加上 --stdin 选项",
            "output-stdin": "要将输出定向到文件，请加上 --file 选项",
            help:
                "用法：loli [选项] [源文件]\n\n" +
                "LC3XT Loli 诊断汇编器\n\n" +
                "选项\n\n" +
                "-h, --help            输出帮助信息\n" +
                "-v, --version         输出版本信息\n" +
                "-l, --lang ...        显式设置语言\n" +
                "--stdin               从标准输入读入源代码\n" +
                "-f, --file            将输出定向到文件\n" +
                "-g, --debug           生成调试信息而不是机器代码",
            "stdin-read": "源代码读入完毕",
            "cannot-read-file": "无法读入源文件 {{file}}",
            assemble: "正在汇编和生成代码",
            debug: "正在生成调试信息",
            "done-binary": "二进制代码生成完毕，总计 {{count}} 个程序段",
            "has-warn": "在第 {{lineNo}} 行发现警告：{{msg}}",
            "has-error": "在第 {{lineNo}} 行发现错误：{{msg}}",
            error: "侦测到不可恢复错误，请先修正代码再尝试汇编",
            "writing-file": "正在写入文件 {{file}}",
            "debug-stdout": "调试信息可能会很长，确定要将其打印到标准输出吗？",
        },
        exception: {
            "unsupported-escape": "无法转义字符串 {{- str}}",
            "missing-args": "指令 {{op}} 缺少参数",
            "unmatched-argc":
                "指令 {{op}} 需要 {{expected}} 个参数，但只找到了 {{found}} 个",
            "suspicious-label-possibly-args":
                "{{content}} 看上去不像一个标签（它前面似乎缺少了指令）",
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
            "suspicious-string": "STRINGZ 填充时发现了空字符串，索引 {{index}}",
            "blkw-without-label": "以 BLKW 填充的地址 {{address}} 没有标签",
            "fill-without-label": "以 FILL 填充的地址 {{address}} 没有标签",
            "string-without-label":
                "以 STRINGZ 填充的地址 {{address}} 没有标签",
            "origin-redefined": "在已经定义起始地址的区段内重新定义起始地址",
            "redundant-end": "在区段外重复声明区段结束",
            "instr-outside-section": "指令不在任何区段内，将使用先前地址",
            "number-bits-overflow": "数字 {{num}} 无法被编码成 {{bits}} 位",
            "empty-program": "装载点位于 {{address}} 的程序段为空",
            "negative-trap":
                "陷阱向量是无符号数，但是发现了 {{vec}}，将按其补码编码",
            "label-redefined": "标签 {{label}} 已经定义过了",
        },
    },
};
