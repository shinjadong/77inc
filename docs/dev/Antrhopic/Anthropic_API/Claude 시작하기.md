# Claude 시작하기

> Claude에 첫 번째 API 호출을 하고 간단한 웹 검색 어시스턴트를 구축하세요

## 사전 요구사항

- Anthropic [Console 계정](https://console.anthropic.com/)
- [API 키](https://console.anthropic.com/settings/keys)

## API 호출하기

### cURL

#### API 키 설정

[Claude Console](https://console.anthropic.com/settings/keys)에서 API 키를 가져와서 환경 변수로 설정하세요:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

#### 첫 번째 API 호출하기
이 명령어를 실행하여 간단한 웹 검색 어시스턴트를 만드세요:
```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1000,
    "messages": [
      {
        "role": "user", 
        "content": "What should I search for to find the latest developments in renewable energy?"
      }
    ]
  }'
```
**예시 출력:**
```json
{
  "id": "msg_01HCDu5LRGeP2o7s2xGmxyx8",
  "type": "message", 
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Here are some effective search strategies to find the latest renewable energy developments:\n\n## Search Terms to Use:\n- \"renewable energy news 2024\"\n- \"clean energy breakthrough\"\n- \"solar/wind/battery technology advances\"\n- \"green energy innovations\"\n- \"climate tech developments\"\n- \"energy storage solutions\"\n\n## Best Sources to Check:\n\n**News & Industry Sites:**\n- Renewable Energy World\n- GreenTech Media (now Wood Mackenzie)\n- Energy Storage News\n- CleanTechnica\n- PV Magazine (for solar)\n- WindPower Engineering & Development..."
    }
  ],
  "model": "claude-sonnet-4-5",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 21,
    "output_tokens": 305
  }
}
```

---

### Python

#### API 키 설정

[Claude Console](https://console.anthropic.com/settings/keys)에서 API 키를 가져와서 환경 변수로 설정하세요:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

#### SDK 설치
Anthropic Python SDK를 설치하세요:
```bash
pip install anthropic
```

#### 코드 작성
이것을 `quickstart.py`로 저장하세요:
```python
import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1000,
    messages=[
        {
            "role": "user",
            "content": "What should I search for to find the latest developments in renewable energy?"
        }
    ]
)
print(message.content)
```

#### 코드 실행
```bash
python quickstart.py
```
**예시 출력:**
```python
[TextBlock(text='Here are some effective search strategies for finding the latest renewable energy developments:\n\n**Search Terms to Use:**\n- "renewable energy news 2024"\n- "clean energy breakthroughs"\n- "solar/wind/battery technology advances"\n- "energy storage innovations"\n- "green hydrogen developments"\n- "renewable energy policy updates"\n\n**Reliable Sources to Check:**\n- **News & Analysis:** Reuters Energy, Bloomberg New Energy Finance, Greentech Media, Energy Storage News\n- **Industry Publications:** Renewable Energy World, PV Magazine, Wind Power Engineering\n- **Research Organizations:** International Energy Agency (IEA), National Renewable Energy Laboratory (NREL)\n- **Government Sources:** Department of Energy websites, EPA clean energy updates\n\n**Specific Topics to Explore:**\n- Perovskite and next-gen solar cells\n- Offshore wind expansion\n- Grid-scale battery storage\n- Green hydrogen production\n- Carbon capture technologies\n- Smart grid innovations\n- Energy policy changes and incentives...', type='text')]
```

---

### TypeScript

#### API 키 설정

[Claude Console](https://console.anthropic.com/settings/keys)에서 API 키를 가져와서 환경 변수로 설정하세요:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

#### SDK 설치
Anthropic TypeScript SDK를 설치하세요:
```bash
npm install @anthropic-ai/sdk
```

#### 코드 작성
이것을 `quickstart.ts`로 저장하세요:
```typescript
import Anthropic from "@anthropic-ai/sdk";
async function main() {
  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: "What should I search for to find the latest developments in renewable energy?"
      }
    ]
  });
  console.log(msg);
}
main().catch(console.error);
```

#### 코드 실행
```bash
npx tsx quickstart.ts
```
**예시 출력:**
```javascript
{
  id: 'msg_01ThFHzad6Bh4TpQ6cHux9t8',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5-20250929',
  content: [
    {
      type: 'text',
      text: 'Here are some effective search strategies to find the latest renewable energy developments:\n\n' +
        '## Search Terms to Use:\n' +
        '- "renewable energy news 2024"\n' +
        '- "clean energy breakthroughs"\n' +
        '- "solar wind technology advances"\n' +
        '- "energy storage innovations"\n' +
        '- "green hydrogen developments"\n' +
        '- "offshore wind projects"\n' +
        '- "battery technology renewable"\n\n' +
        '## Best Sources to Check:\n\n' +
        '**News & Industry Sites:**\n' +
        '- Renewable Energy World\n' +
        '- CleanTechnica\n' +
        '- GreenTech Media (now Wood Mackenzie)\n' +
        '- Energy Storage News\n' +
        '- PV Magazine (for solar)...'
    }
  ],
  stop_reason: 'end_turn',
  usage: {
    input_tokens: 21,
    output_tokens: 302
  }
}
```

---

### Java

#### API 키 설정

[Claude Console](https://console.anthropic.com/settings/keys)에서 API 키를 가져와서 환경 변수로 설정하세요:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

#### SDK 설치
프로젝트에 Anthropic Java SDK를 추가하세요. 먼저 [Maven Central](https://central.sonatype.com/artifact/com.anthropic/anthropic-java)에서 현재 버전을 찾으세요.
**Gradle:**
```gradle
implementation("com.anthropic:anthropic-java:1.0.0")
```
**Maven:**
```xml
<dependency>
  <groupId>com.anthropic</groupId>
  <artifactId>anthropic-java</artifactId>
  <version>1.0.0</version>
</dependency>
```

#### 코드 작성
이것을 `QuickStart.java`로 저장하세요:
```java
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
public class QuickStart {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        MessageCreateParams params = MessageCreateParams.builder()
                .model("claude-sonnet-4-5-20250929")
                .maxTokens(1000)
                .addUserMessage("What should I search for to find the latest developments in renewable energy?")
                .build();
        Message message = client.messages().create(params);
        System.out.println(message.content());
    }
}
```

#### 코드 실행
```bash
javac QuickStart.java
java QuickStart
```
**예시 출력:**
```java
[ContentBlock{text=TextBlock{text=Here are some effective search strategies to find the latest renewable energy developments:
## Search Terms to Use:
- "renewable energy news 2024"
- "clean energy breakthroughs"  
- "solar/wind/battery technology advances"
- "energy storage innovations"
- "green hydrogen developments"
- "renewable energy policy updates"
## Best Sources to Check:
- **News & Analysis:** Reuters Energy, Bloomberg New Energy Finance, Greentech Media
- **Industry Publications:** Renewable Energy World, PV Magazine, Wind Power Engineering
- **Research Organizations:** International Energy Agency (IEA), National Renewable Energy Laboratory (NREL)
- **Government Sources:** Department of Energy websites, EPA clean energy updates
## Specific Topics to Explore:
- Perovskite and next-gen solar cells
- Offshore wind expansion
- Grid-scale battery storage
- Green hydrogen production..., type=text}}]
```

---

## 다음 단계

첫 번째 Claude API 요청을 완료했으니, 이제 다른 가능성들을 탐색해볼 시간입니다:

| 주제 | 설명 | 링크 |
|------|------|------|
| 기능 개요 | Claude의 고급 기능과 역량을 탐색하세요. | [보기](/ko/docs/build-with-claude/overview) |
| 클라이언트 SDK | Anthropic 클라이언트 라이브러리를 발견하세요. | [보기](/ko/api/client-sdks) |
| Claude Cookbook | 대화형 Jupyter 노트북으로 학습하세요. | [보기](https://github.com/anthropics/anthropic-cookbook) |
</smtcmp_block>