# PDF 지원

> Claude로 PDF를 처리하세요. 문서에서 텍스트를 추출하고, 차트를 분석하며, 시각적 콘텐츠를 이해할 수 있습니다.

이제 Claude에게 제공하는 PDF의 모든 텍스트, 그림, 차트, 표에 대해 질문할 수 있습니다.

---

## 사용 사례

- 재무 보고서 분석 및 차트/표 이해
- 법률 문서에서 핵심 정보 추출
- 문서 번역 지원
- 문서 정보를 구조화된 형식으로 변환

---

## 시작하기 전에

### PDF 요구사항
Claude는 모든 표준 PDF와 작동합니다. PDF 지원을 사용할 때 요청이 다음 요구사항을 충족하는지 확인하세요:
| 요구사항 | 제한 |
|---------|------|
| 최대 요청 크기 | 32MB |
| 요청당 최대 페이지 수 | 100 |
| 형식 | 표준 PDF (비밀번호/암호화 없음) |
**주의**: 두 제한 모두 PDF와 함께 전송되는 다른 콘텐츠를 포함한 전체 요청 페이로드에 적용됩니다.

### 비전 기능 제한사항
PDF 지원은 Claude의 비전 기능에 의존하므로, 다른 비전 작업과 동일한 제한사항이 적용됩니다. 자세한 내용은 [비전 제한사항 및 고려사항](/ko/docs/build-with-claude/vision#limitations)을 참조하세요.

### 지원되는 플랫폼 및 모델

**직접 API 액세스**: 모든 [활성 모델](/ko/docs/about-claude/models/overview)이 PDF 처리를 지원합니다.
**Google Vertex AI**: 모든 활성 모델에서 사용 가능합니다.

---

## Amazon Bedrock의 PDF 지원
Amazon Bedrock의 Converse API를 통해 PDF 지원을 사용할 때, 두 가지 별개의 문서 처리 모드가 있습니다.

### 중요 사항

Converse API에서 Claude의 **전체 시각적 PDF 이해 기능에 액세스하려면 인용을 활성화해야 합니다**. 

인용이 활성화되지 않으면 API는 기본 텍스트 추출만으로 되돌아갑니다. [인용 작업](/ko/docs/build-with-claude/citations)에 대해 자세히 알아보세요.

### 문서 처리 모드 비교

#### 1. Converse Document Chat (원래 모드)

**기능:**
- PDF에서 기본 텍스트 추출 제공
- PDF 내의 이미지, 차트 또는 시각적 레이아웃을 분석할 수 없음
- 3페이지 PDF에 대해 약 1,000개 토큰 사용

**사용 조건:**
- 인용이 활성화되지 않은 경우 자동으로 사용됨
#### 2. Claude PDF Chat (새로운 모드)

**기능:**
- PDF의 완전한 시각적 분석 제공
- 차트, 그래프, 이미지 및 시각적 레이아웃을 이해하고 분석할 수 있음
- 포괄적인 이해를 위해 각 페이지를 텍스트와 이미지 모두로 처리
- 3페이지 PDF에 대해 약 7,000개 토큰 사용

**사용 조건:**
- **Converse API에서 인용이 활성화되어야 함**
### Amazon Bedrock 주요 제한사항

| 제한사항 | 설명 |
|---------|------|
| Converse API (시각적 분석) | 인용이 활성화되어야 함 |
| InvokeModel API | 강제 인용 없이 PDF 처리에 대한 완전한 제어 제공 |

**해결책:**
- 시각적 PDF 분석을 위해 **Converse API에서 인용을 활성화**하세요
- 인용 없이 시각적 분석이 필요한 경우 **InvokeModel API 사용**을 고려하세요

### 일반적인 문제 해결

**증상**: Claude가 PDF의 이미지나 차트를 보지 못함

**원인**: Converse API 사용 시 인용 플래그가 비활성화됨

**해결책**: 인용을 활성화하면 시각적 분석이 자동으로 복원됨

### 다른 파일 형식

.csv, .xlsx, .docx, .md 또는 .txt 파일의 경우 [다른 파일 형식 작업](/ko/docs/build-with-claude/files#working-with-other-file-formats)을 참조하세요.

---

## Claude로 PDF 처리

### 첫 번째 PDF 요청 보내기

Claude에게 PDF를 제공하는 방법은 세 가지입니다:
1. **온라인에 호스팅된 PDF**: URL 참조로
2. **로컬 PDF 파일**: base64로 인코딩된 형태로
3. **반복 사용 PDF**: Files API의 `file_id`로
---

## 옵션 1: URL 기반 PDF 문서
가장 간단한 접근 방식은 URL에서 PDF를 직접 참조하는 것입니다.

### Shell

```bash
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [{
        "role": "user",
        "content": [{
            "type": "document",
            "source": {
                "type": "url",
                "url": "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf"
            }
        },
        {
            "type": "text",
            "text": "What are the key findings in this document?"
        }]
    }]
}'
```
### Python

```python
import anthropic
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "url",
                        "url": "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf"
                    }
                },
                {
                    "type": "text",
                    "text": "What are the key findings in this document?"
                }
            ]
        }
    ],
)
print(message.content)
```
### TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic();
async function main() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'url',
              url: 'https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf',
            },
          },
          {
            type: 'text',
            text: 'What are the key findings in this document?',
          },
        ],
      },
    ],
  });
  
  console.log(response);
}
main();
```
### Java

```java
import java.util.List;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.*;
public class PdfExample {
    public static void main(String[] args) {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        DocumentBlockParam documentParam = DocumentBlockParam.builder()
                .urlPdfSource("https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf")
                .build();
        MessageCreateParams params = MessageCreateParams.builder()
                .model(Model.CLAUDE_OPUS_4_20250514)
                .maxTokens(1024)
                .addUserMessageOfBlockParams(
                        List.of(
                            ContentBlockParam.ofDocument(documentParam),
                            ContentBlockParam.ofText(
                                TextBlockParam.builder()
                                    .text("What are the key findings in this document?")
                                    .build()
                            )
                        )
                )
                .build();
        Message message = client.messages().create(params);
        System.out.println(message.content());
    }
}
```

---

## 옵션 2: Base64로 인코딩된 PDF 문서
로컬 시스템에서 PDF를 보내거나 URL을 사용할 수 없는 경우 base64 인코딩을 사용합니다.

### Shell

#### 방법 1: 원격 PDF 가져오기 및 인코딩

```bash
curl -s "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf" | base64 | tr -d '\n' > pdf_base64.txt
```

#### 방법 2: 로컬 PDF 파일 인코딩

```bash
base64 document.pdf | tr -d '\n' > pdf_base64.txt
```

#### API 요청 보내기

```bash
jq -n --rawfile PDF_BASE64 pdf_base64.txt '{
    "model": "claude-sonnet-4-5",
    "max_tokens": 1024,
    "messages": [{
        "role": "user",
        "content": [{
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": $PDF_BASE64
            }
        },
        {
            "type": "text",
            "text": "What are the key findings in this document?"
        }]
    }]
}' > request.json
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d @request.json
```
### Python

```python
import anthropic
import base64
import httpx
# 방법 1: 원격 PDF 다운로드 및 인코딩
pdf_url = "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf"
pdf_data = base64.standard_b64encode(httpx.get(pdf_url).content).decode("utf-8")
# 방법 2: 로컬 파일에서 로드
# with open("document.pdf", "rb") as f:
#     pdf_data = base64.standard_b64encode(f.read()).decode("utf-8")
client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data
                    }
                },
                {
                    "type": "text",
                    "text": "What are the key findings in this document?"
                }
            ]
        }
    ],
)
print(message.content)
```
### TypeScript

```typescript
import Anthropic from '@anthropic-ai/sdk';
import fetch from 'node-fetch';
import fs from 'fs';
async function main() {
  // 방법 1: 원격 PDF 가져오기 및 인코딩
  const pdfURL = "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf";
  const pdfResponse = await fetch(pdfURL);
  const arrayBuffer = await pdfResponse.arrayBuffer();
  const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');
  
  // 방법 2: 로컬 파일에서 로드
  // const pdfBase64 = fs.readFileSync('document.pdf').toString('base64');
  
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: 'What are the key findings in this document?',
          },
        ],
      },
    ],
  });
  
  console.log(response);
}
main();
```
### Java

```java
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Base64;
import java.util.List;
import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.DocumentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.TextBlockParam;
public class PdfExample {
    public static void main(String[] args) throws IOException, InterruptedException {
        AnthropicClient client = AnthropicOkHttpClient.fromEnv();
        // 방법 1: 원격 PDF 다운로드 및 인코딩
        String pdfUrl = "https://assets.anthropic.com/m/1cd9d098ac3e6467/original/Claude-3-Model-Card-October-Addendum.pdf";
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(pdfUrl))
                .GET()
                .build();
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        String pdfBase64 = Base64.getEncoder().encodeToString(response.body());
        // 방법 2: 로컬 파일에서 로드
        // byte[] fileBytes = Files.readAllBytes(Path.of("document.pdf"));
        // String pdfBase64 = Base64.getEncoder().encodeToString(fileBytes);
        DocumentBlockParam documentParam = DocumentBlockParam.builder()
                .base64PdfSource(pdfBase64)
                .build();
        MessageCreateParams params = MessageCreateParams.builder()
                .model(Model.CLAUDE_OPUS_4_20250514)
                .maxTokens(1024)
                .addUserMessageOfBlockParams(
                        List.of(
                            ContentBlockParam.ofDocument(documentParam),
                            ContentBlockParam.ofText(
                                TextBlockParam.builder()
                                    .text("What are the key findings in this document?")
                                    .build()
                            )
                        )
                )
                .build();
        Message message = client.messages().create(params);
        System.out.println(message.content());
    }
}
```
---
## PDF 지원 작동 원리

Claude에게 PDF를 보내면 다음 단계가 발생합니다:

### 1단계: 문서 콘텐츠 추출

- 시스템이 문서의 각 페이지를 이미지로 변환합니다
- 각 페이지의 텍스트가 추출되어 각 페이지의 이미지와 함께 제공됩니다

### 2단계: 텍스트와 이미지 분석

- 문서는 분석을 위해 텍스트와 이미지의 조합으로 제공됩니다
- 이를 통해 차트, 다이어그램 및 기타 비텍스트 콘텐츠와 같은 PDF의 시각적 요소에 대한 인사이트를 요청할 수 있습니다

### 3단계: 응답 생성

Claude가 관련이 있는 경우 PDF의 내용을 참조하여 응답합니다.

PDF 지원을 다음과 통합하여 성능을 더욱 향상시킬 수 있습니다:
- **프롬프트 캐싱**: 반복 분석의 성능을 향상시키기 위해
- **배치 처리**: 대용량 문서 처리를 위해
- **도구 사용**: 문서에서 특정 정보를 추출하여 도구 입력으로 사용하기 위해

---

## 비용 추정

PDF 파일의 토큰 수는 문서에서 추출된 총 텍스트와 페이지 수에 따라 달라집니다:

### 토큰 비용 분류

**텍스트 토큰:**
- 각 페이지는 일반적으로 콘텐츠 밀도에 따라 페이지당 1,500-3,000개의 토큰을 사용
- 추가 PDF 수수료 없이 표준 API 가격이 적용됩니다

**이미지 토큰:**
- 각 페이지가 이미지로 변환되므로 동일한 [이미지 기반 비용 계산](/ko/docs/build-with-claude/vision#evaluate-image-size)이 적용됩니다

### 비용 추정 방법

특정 PDF의 비용을 추정하려면 [토큰 계산](/ko/docs/build-with-claude/token-counting)을 사용할 수 있습니다.

---

## PDF 처리 최적화

### 성능 향상 모범 사례

- 요청에서 PDF를 텍스트보다 앞에 배치
- 표준 글꼴 사용
- 텍스트가 명확하고 읽기 쉬운지 확인
- 페이지를 적절한 세로 방향으로 회전
- 프롬프트에서 논리적 페이지 번호(PDF 뷰어에서) 사용
- 필요할 때 큰 PDF를 청크로 분할
- 반복 분석을 위해 프롬프트 캐싱 활성화

### 구현 확장

대용량 처리의 경우 다음 접근 방식을 고려하세요.

---