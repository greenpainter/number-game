Add-Type -AssemblyName System.Speech

$audioDir = Join-Path $PSScriptRoot "audio"
if (!(Test-Path $audioDir)) {
    New-Item -ItemType Directory -Path $audioDir | Out-Null
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# 한국어 음성 선택 시도
$voices = $synth.GetInstalledVoices()
foreach ($v in $voices) {
    if ($v.VoiceInfo.Culture.Name -like "*ko*") {
        $synth.SelectVoice($v.VoiceInfo.Name)
        break
    }
}

$items = @(
    @{ name = "num_1.wav"; text = "1은 하나!" },
    @{ name = "num_2.wav"; text = "2는 둘!" },
    @{ name = "num_3.wav"; text = "3은 셋!" },
    @{ name = "num_4.wav"; text = "4는 넷!" },
    @{ name = "num_5.wav"; text = "5는 다섯!" },
    @{ name = "num_6.wav"; text = "6은 여섯!" },
    @{ name = "num_7.wav"; text = "7은 일곱!" },
    @{ name = "num_8.wav"; text = "8은 여덟!" },
    @{ name = "num_9.wav"; text = "9는 아홉!" },
    @{ name = "num_10.wav"; text = "10은 열!" },
    @{ name = "vehicle_bus.wav"; text = "신나는 꼬마 버스!" },
    @{ name = "vehicle_car.wav"; text = "빨간 승용차!" },
    @{ name = "vehicle_truck.wav"; text = "신나는 덤프트럭!" },
    @{ name = "vehicle_excavator.wav"; text = "포크레인 굴착기!" },
    @{ name = "dig_start.wav"; text = "굴착기로 교체하고 모래를 퍼보아요!" },
    @{ name = "dig_success.wav"; text = "와! 모래를 가득 실었어요! 이제 덤프트럭을 신나게 운전해보아요!" },
    @{ name = "coloring_finish.wav"; text = "와! 알록달록 코끼리가 예뻐졌어요!" },
    @{ name = "portal_number.wav"; text = "숫자 놀이를 시작해요!" },
    @{ name = "portal_town.wav"; text = "마을 운전 놀이를 시작해요!" },
    @{ name = "portal_color.wav"; text = "색칠 놀이를 시작해요!" }
)

foreach ($item in $items) {
    $outPath = Join-Path $audioDir $item.name
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($item.text)
    Write-Host "Generated audio:" $item.name
}

$synth.SetOutputToNull()
$synth.Dispose()
Write-Host "All audio files generated successfully!"
