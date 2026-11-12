'use client';

import {Extension, type Editor, type JSONContent} from '@tiptap/core';
import {NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps} from '@tiptap/react';
import {Plugin, PluginKey, TextSelection} from '@tiptap/pm/state';
import type {Node as PMNode} from '@tiptap/pm/model';
import {useState} from 'react';
import {HStack} from '@astryxdesign/core/Layout';
import {Text} from '@astryxdesign/core/Text';
import {TextInput} from '@astryxdesign/core/TextInput';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {Button} from '@astryxdesign/core/Button';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Icon} from '@astryxdesign/core/Icon';
import {Check, Copy, Plus, Trash2} from 'lucide-react';
import {
  AcceptanceCriteriaNode,
  ApiEndpointNode,
  KEYWORD_LABELS,
  ParameterNode,
  ParameterTableNode,
  PRIORITY_LABELS,
  ProcedureStepNode,
  ProcedureStepsNode,
  ReferenceListNode,
  ReferenceNode,
  RequirementListNode,
  RequirementNode,
  ScenarioNode,
  ScenarioStepNode,
  SHELL_PROMPTS,
  StoryPartNode,
  STORY_LABELS,
  StudioCodeBlock,
  TerminalCommandNode,
  TerminalNode,
  TerminalOutputNode,
  TestimonialNode,
  UserStoryNode,
} from '@/components/caseStudy/structuredBlocks';
import {languageLabel} from '@/components/caseStudy/highlight';

/**
 * The editor half of the Phase 3 blocks (block contract §3.2, B6): what people write is edited on
 * the page, in place; settings (language, shell, which columns show, consent) are in the
 * inspector. Every control is labelled for screen readers and reachable with Tab; Enter and
 * ⌘/Ctrl+Enter behave as each block's people expect (a new requirement, an "And" step…).
 */

// ---- Helpers ------------------------------------------------------------------------------------------

const PRIORITIES = [{value: '', label: 'No priority'}, ...Object.entries(PRIORITY_LABELS).map(([value, label]) => ({value, label}))];
const KEYWORDS = Object.entries(KEYWORD_LABELS).map(([value, label]) => ({value, label}));
const REFERENCE_KINDS = [
  {value: 'document', label: 'Document'},
  {value: 'standard', label: 'Standard'},
  {value: 'issue', label: 'Issue or ticket'},
  {value: 'website', label: 'Website'},
  {value: 'other', label: 'Other'},
];

/** Adds a child at the end of a block, and puts the cursor in it. */
function appendChild(props: ReactNodeViewProps, child: JSONContent) {
  const pos = props.getPos();
  if (typeof pos !== 'number') return;
  const end = pos + props.node.nodeSize - 1;
  props.editor.chain().insertContentAt(end, child).run();
  const $inside = props.editor.state.doc.resolve(Math.min(end + 1, props.editor.state.doc.content.size));
  props.editor.chain().setTextSelection(TextSelection.near($inside).from).focus().run();
}

/** The number of children of the block around a child node view (to keep at least one). */
function siblings(props: ReactNodeViewProps) {
  const pos = props.getPos();
  if (typeof pos !== 'number') return 1;
  return props.editor.state.doc.resolve(pos).parent.childCount;
}

/** A small text field on the page (in a block). Edits are attribute changes: one undo step each. */
function Field({label, value, onChange, width = '12rem', placeholder}: {label: string; value: string; onChange: (value: string) => void; width?: string; placeholder?: string}) {
  return (
    <span className="write-inline-field" contentEditable={false} style={{inlineSize: width}}>
      <TextInput label={label} isLabelHidden placeholder={placeholder ?? label} value={value} onChange={onChange} size="sm" width="100%" />
    </span>
  );
}

function RemoveButton({props, label}: {props: ReactNodeViewProps; label: string}) {
  return (
    <span contentEditable={false} className="write-inline-action">
      <IconButton label={label} tooltip={label} size="sm" variant="ghost" isDisabled={siblings(props) <= 1} onClick={() => props.deleteNode()} icon={<Icon icon={Trash2} size="sm" color="inherit" />} />
    </span>
  );
}

function AddButton({label, onClick}: {label: string; onClick: () => void}) {
  return (
    <div contentEditable={false} className="write-block-add write-row">
      <Button label={label} size="sm" variant="ghost" onClick={onClick} icon={<Icon icon={Plus} size="sm" color="inherit" />} />
    </div>
  );
}

function CopyButton({label, text}: {label: string; text: () => string}) {
  const [done, setDone] = useState(false);
  return (
    <span contentEditable={false}>
      <IconButton
        label={done ? 'Copied' : label}
        tooltip={done ? 'Copied' : label}
        size="sm"
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard?.writeText(text()).catch(() => undefined);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
        icon={<Icon icon={done ? Check : Copy} size="sm" color="inherit" />}
      />
    </span>
  );
}

// ---- Code block -------------------------------------------------------------------------------------

function CodeBlockView(props: ReactNodeViewProps) {
  const {title, language, lineNumbers, wrap} = props.node.attrs as {title: string; language: string | null; lineNumbers: boolean; wrap: boolean};
  const lines = Math.max(1, props.node.textContent.split('\n').length);
  return (
    <NodeViewWrapper as="figure" className="cs-code write-code" data-language={language || undefined}>
      <div className="cs-code-head write-row" contentEditable={false}>
        <Field label="Code title" placeholder="Title (optional)" value={title ?? ''} onChange={value => props.updateAttributes({title: value.slice(0, 300)})} width="16rem" />
        <HStack gap={1} vAlign="center">
          <Text type="supporting" color="secondary">
            {languageLabel(language)}
          </Text>
          <CopyButton label="Copy code" text={() => props.node.textContent} />
        </HStack>
      </div>
      <pre data-line-numbers={String(Boolean(lineNumbers))} data-wrap={String(Boolean(wrap))}>
        {lineNumbers && (
          <span className="cs-code-lines" aria-hidden="true" contentEditable={false}>
            {Array.from({length: lines}, (_, index) => `${index + 1}\n`).join('')}
          </span>
        )}
        <NodeViewContent<'code'> as="code" className={language ? `language-${language}` : undefined} />
      </pre>
    </NodeViewWrapper>
  );
}

// ---- Terminal ---------------------------------------------------------------------------------------

function TerminalView(props: ReactNodeViewProps) {
  const {shell, prompt} = props.node.attrs as {shell: string; prompt: string};
  const commands = () => {
    const out: string[] = [];
    props.node.forEach(line => {
      if (line.type.name === 'terminalCommand') out.push(line.textContent);
    });
    return out.join('\n');
  };
  return (
    <NodeViewWrapper className="cs-terminal write-terminal" data-shell={shell} style={{'--cs-prompt': JSON.stringify(`${prompt || SHELL_PROMPTS[shell] || '$'} `)} as React.CSSProperties}>
      <div className="cs-terminal-head write-row" contentEditable={false}>
        <Text type="supporting">{shell === 'powershell' ? 'PowerShell' : shell === 'cmd' ? 'Command Prompt' : 'Terminal'}</Text>
        <CopyButton label="Copy the commands" text={commands} />
      </div>
      <NodeViewContent className="cs-terminal-lines" />
      <div contentEditable={false} className="write-block-add write-row">
        <Button label="Add command" size="sm" variant="ghost" onClick={() => appendChild(props, {type: 'terminalCommand'})} icon={<Icon icon={Plus} size="sm" color="inherit" />} />
        <Button label="Add output" size="sm" variant="ghost" onClick={() => appendChild(props, {type: 'terminalOutput'})} icon={<Icon icon={Plus} size="sm" color="inherit" />} />
      </div>
    </NodeViewWrapper>
  );
}

/** ⌘/Ctrl+Enter in a terminal line adds a line of the other kind after it (command → output → command). */
function nextTerminalLine(editor: Editor) {
  const {$from} = editor.state.selection;
  const line = $from.parent;
  if (line.type.name !== 'terminalCommand' && line.type.name !== 'terminalOutput') return false;
  const after = $from.after();
  const type = line.type.name === 'terminalCommand' ? 'terminalOutput' : 'terminalCommand';
  return editor.chain().insertContentAt(after, {type}).setTextSelection(after + 1).run();
}

// ---- API Endpoint -----------------------------------------------------------------------------------

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
const AUTH_OPTIONS = [
  {value: 'bearer', label: 'Bearer Token'},
  {value: 'apiKey', label: 'API Key'},
  {value: 'basic', label: 'Basic Auth'},
  {value: 'oauth2', label: 'OAuth 2.0'},
  {value: 'none', label: 'Public (No Auth)'},
];

function ApiEndpointView(props: ReactNodeViewProps) {
  const attrs = props.node.attrs as {
    method: string;
    path: string;
    summary: string;
    auth: string;
    requestType: string;
    requestBody: string;
    responseStatus: string;
    responseBody: string;
  };
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request');
  const method = attrs.method || 'GET';

  return (
    <NodeViewWrapper className="cs-endpoint write-endpoint" data-method={method}>
      <div className="cs-endpoint-head write-row" contentEditable={false}>
        <div className="cs-endpoint-method-pills" role="radiogroup" aria-label="HTTP Method">
          {HTTP_METHODS.map(m => (
            <button
              key={m}
              type="button"
              className={`cs-method-badge cs-method-${m.toLowerCase()} ${method === m ? 'cs-method-active' : ''}`}
              onClick={() => props.updateAttributes({method: m})}
            >
              {m}
            </button>
          ))}
        </div>
        <Field
          label="Endpoint Path"
          placeholder="/api/v1/resource"
          value={attrs.path}
          onChange={path => props.updateAttributes({path: path.slice(0, 300)})}
          width="16rem"
        />
        <Selector
          label="Authentication"
          isLabelHidden
          size="sm"
          options={AUTH_OPTIONS}
          value={attrs.auth || 'bearer'}
          onChange={auth => props.updateAttributes({auth})}
        />
        <Field
          label="Summary"
          placeholder="Summary of endpoint"
          value={attrs.summary}
          onChange={summary => props.updateAttributes({summary: summary.slice(0, 120)})}
          width="14rem"
        />
      </div>

      <div className="cs-endpoint-tabs-bar write-row" contentEditable={false}>
        <div className="cs-endpoint-tabs">
          <button
            type="button"
            className={`cs-endpoint-tab ${activeTab === 'request' ? 'cs-endpoint-tab-active' : ''}`}
            onClick={() => setActiveTab('request')}
          >
            Request
          </button>
          <button
            type="button"
            className={`cs-endpoint-tab ${activeTab === 'response' ? 'cs-endpoint-tab-active' : ''}`}
            onClick={() => setActiveTab('response')}
          >
            Response
          </button>
        </div>
        {activeTab === 'request' ? (
          <Field
            label="Content Type"
            placeholder="application/json"
            value={attrs.requestType}
            onChange={requestType => props.updateAttributes({requestType: requestType.slice(0, 100)})}
            width="12rem"
          />
        ) : (
          <Field
            label="Response Status"
            placeholder="200 OK"
            value={attrs.responseStatus}
            onChange={responseStatus => props.updateAttributes({responseStatus: responseStatus.slice(0, 50)})}
            width="12rem"
          />
        )}
      </div>

      <div className="cs-endpoint-body" contentEditable={false}>
        {activeTab === 'request' ? (
          <textarea
            className="cs-endpoint-schema-input"
            aria-label="Request schema and payload"
            placeholder="Request body JSON schema or sample..."
            value={attrs.requestBody || ''}
            onChange={e => props.updateAttributes({requestBody: e.target.value.slice(0, 5000)})}
            rows={4}
            spellCheck={false}
          />
        ) : (
          <textarea
            className="cs-endpoint-schema-input"
            aria-label="Response schema and payload"
            placeholder="Response body JSON schema or sample..."
            value={attrs.responseBody || ''}
            onChange={e => props.updateAttributes({responseBody: e.target.value.slice(0, 5000)})}
            rows={4}
            spellCheck={false}
          />
        )}
      </div>

      <NodeViewContent className="cs-endpoint-description" />
    </NodeViewWrapper>
  );
}

// ---- Parameter table ----------------------------------------------------------------------------------

function ParameterTableView(props: ReactNodeViewProps) {
  const {showRequired, showDefault} = props.node.attrs as {showRequired: boolean; showDefault: boolean};
  return (
    <NodeViewWrapper className="cs-params write-params" data-show-required={String(showRequired)} data-show-default={String(showDefault)}>
      <div className="cs-params-header" contentEditable={false} aria-hidden="true">
        <span>Name</span>
        <span>Type</span>
        <span className="cs-param-required">Required</span>
        <span className="cs-param-default">Default</span>
        <span>Description</span>
      </div>
      <NodeViewContent />
      <AddButton label="Add parameter" onClick={() => appendChild(props, {type: 'parameter', content: [{type: 'paragraph'}]})} />
    </NodeViewWrapper>
  );
}

function ParameterView(props: ReactNodeViewProps) {
  const attrs = props.node.attrs as {name: string; type: string; required: boolean; default: string};
  const name = attrs.name || 'this parameter';
  return (
    <NodeViewWrapper className="cs-param write-param">
      <div className="cs-param-head" contentEditable={false}>
        <Field label="Parameter name" placeholder="Name" value={attrs.name} onChange={value => props.updateAttributes({name: value.slice(0, 120)})} width="100%" />
        <Field label={`Type of ${name}`} placeholder="Type" value={attrs.type} onChange={value => props.updateAttributes({type: value.slice(0, 120)})} width="100%" />
        <span className="cs-param-required">
          <Switch label={`${name} is required`} isLabelHidden size="sm" value={attrs.required} onChange={required => props.updateAttributes({required})} />
        </span>
        <span className="cs-param-default">
          <Field label={`Default value of ${name}`} placeholder="Default" value={attrs.default} onChange={value => props.updateAttributes({default: value.slice(0, 300)})} width="100%" />
        </span>
      </div>
      <NodeViewContent className="cs-param-description" />
      <RemoveButton props={props} label={`Remove ${name}`} />
    </NodeViewWrapper>
  );
}

// ---- Requirements -------------------------------------------------------------------------------------

function RequirementListView(props: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="cs-requirements-wrap">
      <NodeViewContent<'ol'> as="ol" className="cs-requirements" />
      <AddButton label="Add requirement" onClick={() => appendChild(props, {type: 'requirement', content: [{type: 'paragraph'}]})} />
    </NodeViewWrapper>
  );
}

function RequirementView(props: ReactNodeViewProps) {
  const {reqId, priority} = props.node.attrs as {reqId: string; priority: string | null};
  const name = reqId || 'this requirement';
  return (
    <NodeViewWrapper as="li" className="cs-requirement write-requirement" data-priority={priority ?? undefined}>
      <span className="cs-req-meta" contentEditable={false}>
        <Field
          label="Requirement id"
          placeholder="Id"
          value={reqId}
          width="6.5rem"
          onChange={value => {
            // Typing an id is never renumbered (see RequirementIds).
            const pos = props.getPos();
            if (typeof pos !== 'number') return;
            props.editor.view.dispatch(props.editor.state.tr.setNodeAttribute(pos, 'reqId', value.replace(/\s+/g, '').slice(0, 20)).setMeta(REQ_ID_TYPING, true));
          }}
        />
        <Selector label={`Priority of ${name}`} isLabelHidden size="sm" options={PRIORITIES} value={priority ?? ''} onChange={value => props.updateAttributes({priority: value || null})} />
      </span>
      <NodeViewContent className="cs-req-text" />
      <RemoveButton props={props} label={`Remove ${name}`} />
    </NodeViewWrapper>
  );
}

const REQ_ID_TYPING = 'studioReqIdTyping';
const reqIdsKey = new PluginKey('studioRequirementIds');

/**
 * Every requirement gets an id when it is created (a new list, Enter, the Add button): the next
 * number after the highest in the document, with the prefix most ids use (FR-, R-…). Ids people
 * type are never changed. Duplicates are reported by the review, not silently renumbered, so a
 * moved or pasted requirement keeps the id tickets and tests refer to.
 */
export const RequirementIds = Extension.create({
  name: 'studioRequirementIds',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reqIdsKey,
        appendTransaction(transactions, _old, state) {
          if (!transactions.some(tr => tr.docChanged) || transactions.some(tr => tr.getMeta(REQ_ID_TYPING))) return null;
          const empty: number[] = [];
          const prefixes = new Map<string, number>();
          let highest = 0;
          state.doc.descendants((node: PMNode, pos: number) => {
            if (node.type.name !== 'requirement') return true;
            const id = String(node.attrs.reqId ?? '');
            const match = /^(.*?)(\d+)$/.exec(id);
            if (!id) empty.push(pos);
            else if (match) {
              prefixes.set(match[1], (prefixes.get(match[1]) ?? 0) + 1);
              highest = Math.max(highest, Number(match[2]));
            }
            return false;
          });
          if (!empty.length) return null;
          const prefix = [...prefixes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'R-';
          const tr = state.tr;
          empty.forEach(pos => tr.setNodeAttribute(pos, 'reqId', `${prefix}${(highest += 1)}`));
          return tr.setMeta('addToHistory', false);
        },
      }),
    ];
  },
});

// ---- User story ---------------------------------------------------------------------------------------

function UserStoryView() {
  return (
    <NodeViewWrapper className="cs-story" role="group" aria-label="User story">
      <NodeViewContent />
    </NodeViewWrapper>
  );
}

function StoryPartView(props: ReactNodeViewProps) {
  const part = String(props.node.attrs.part);
  return (
    <NodeViewWrapper as="p" className="cs-story-part" data-story-part={part}>
      <span className="cs-story-label" contentEditable={false}>
        {STORY_LABELS[part]}
      </span>
      <NodeViewContent<'span'> as="span" className="cs-story-text" />
    </NodeViewWrapper>
  );
}

/** Enter in a story part goes to the next part; after "so that", to a new paragraph below the story. */
function nextStoryPart(editor: Editor) {
  const {$from} = editor.state.selection;
  if ($from.parent.type.name !== 'storyPart') return false;
  const story = $from.node(-1);
  const index = $from.index(-1);
  if (index < story.childCount - 1) return editor.commands.setTextSelection($from.after() + 1);
  const after = $from.after(-1);
  return editor.chain().insertContentAt(after, {type: 'paragraph'}).setTextSelection(after + 1).run();
}

// ---- Acceptance criteria -------------------------------------------------------------------------------

const newScenario = (): JSONContent => ({
  type: 'scenario',
  content: (['given', 'when', 'then'] as const).map(keyword => ({type: 'scenarioStep', attrs: {keyword}})),
});

function AcceptanceCriteriaView(props: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="cs-criteria">
      <NodeViewContent />
      <AddButton label="Add scenario" onClick={() => appendChild(props, newScenario())} />
    </NodeViewWrapper>
  );
}

function ScenarioView(props: ReactNodeViewProps) {
  const {title, requirementRef} = props.node.attrs as {title: string; requirementRef: string};
  return (
    <NodeViewWrapper as="section" className="cs-scenario write-scenario">
      <div className="cs-scenario-title write-row" contentEditable={false}>
        <Text type="supporting">Scenario</Text>
        <Field label="Scenario title" placeholder="What it checks" value={title} onChange={value => props.updateAttributes({title: value.slice(0, 300)})} width="18rem" />
        <Field
          label="Requirement it checks"
          placeholder="Requirement id"
          value={requirementRef}
          onChange={value => props.updateAttributes({requirementRef: value.replace(/\s+/g, '').slice(0, 20)})}
          width="8rem"
        />
        <RemoveButton props={props} label={`Remove scenario${title ? ` “${title}”` : ''}`} />
      </div>
      <NodeViewContent<'ul'> as="ul" className="cs-scenario-steps" />
      <div contentEditable={false} className="write-block-add write-row cs-scenario-quick-add">
        <span className="cs-scenario-quick-add-label">Add step:</span>
        {KEYWORDS.map(k => (
          <Button
            key={k.value}
            label={`+ ${k.label}`}
            size="sm"
            variant="ghost"
            onClick={() => appendChild(props, {type: 'scenarioStep', attrs: {keyword: k.value}})}
          />
        ))}
      </div>
    </NodeViewWrapper>
  );
}

function ScenarioStepView(props: ReactNodeViewProps) {
  const keyword = String(props.node.attrs.keyword);
  return (
    <NodeViewWrapper as="li" className="cs-scenario-step write-scenario-step" data-keyword={keyword}>
      <span contentEditable={false} className="cs-step-keyword-pills" role="toolbar" aria-label="BDD step keyword">
        {KEYWORDS.map(k => (
          <button
            key={k.value}
            type="button"
            className={`cs-step-pill ${keyword === k.value ? 'cs-step-pill-active' : ''}`}
            data-keyword={k.value}
            onClick={() => props.updateAttributes({keyword: k.value})}
            title={`Set to ${k.label}`}
          >
            {k.label}
          </button>
        ))}
      </span>
      <NodeViewContent<'span'> as="span" className="cs-step-text" />
    </NodeViewWrapper>
  );
}

/** Enter in a step adds an "And" step after it; in an empty last step, leaves the block. */
function nextScenarioStep(editor: Editor) {
  const {state} = editor;
  const {$from} = state.selection;
  if ($from.parent.type.name !== 'scenarioStep') return false;
  const scenario = $from.node(-1);
  const isLast = $from.index(-1) === scenario.childCount - 1;
  if (!$from.parent.textContent && isLast && scenario.childCount > 1) {
    const tr = state.tr.delete($from.before(), $from.after());
    const at = tr.mapping.map($from.after(-2));
    tr.insert(at, state.schema.nodes.paragraph.create());
    tr.setSelection(TextSelection.create(tr.doc, at + 1));
    editor.view.dispatch(tr.scrollIntoView());
    return true;
  }
  return editor.commands.splitBlock({keepMarks: false});
}

// ---- Testimonial --------------------------------------------------------------------------------------

function TestimonialView(props: ReactNodeViewProps) {
  const {person, role, organisation, consent} = props.node.attrs as {person: string; role: string; organisation: string; consent: string};
  return (
    <NodeViewWrapper as="figure" className="cs-testimonial write-testimonial">
      <NodeViewContent<'blockquote'> as="blockquote" className="cs-testimonial-quote" />
      <figcaption className="cs-testimonial-by write-row" contentEditable={false}>
        <Field label="Who said it" placeholder="Name" value={person} onChange={value => props.updateAttributes({person: value.slice(0, 300)})} />
        <Field label="Their role" placeholder="Role" value={role} onChange={value => props.updateAttributes({role: value.slice(0, 300)})} />
        <Field label="Organisation" value={organisation} onChange={value => props.updateAttributes({organisation: value.slice(0, 300)})} />
        <span className="write-consent" data-consent={consent}>
          {consent === 'approved' ? 'Approved for quoting' : consent === 'pending' ? 'Approval pending' : 'Not approved yet'}
        </span>
      </figcaption>
    </NodeViewWrapper>
  );
}

// ---- Procedure steps ----------------------------------------------------------------------------------

function ProcedureStepsView(props: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="cs-procedure-wrap">
      <NodeViewContent<'ol'> as="ol" className="cs-procedure" />
      <AddButton label="Add step" onClick={() => appendChild(props, {type: 'procedureStep', content: [{type: 'paragraph'}]})} />
    </NodeViewWrapper>
  );
}

function ProcedureStepView(props: ReactNodeViewProps) {
  const {owner, expected} = props.node.attrs as {owner: string; expected: string};
  return (
    <NodeViewWrapper as="li" className="cs-procedure-step write-procedure-step">
      <NodeViewContent className="cs-step-body" />
      <div className="cs-step-facts write-row" contentEditable={false}>
        <Field label="Who does this step" placeholder="Who (optional)" value={owner} onChange={value => props.updateAttributes({owner: value.slice(0, 300)})} />
        <Field label="Expected result of this step" placeholder="Expected result (optional)" value={expected} onChange={value => props.updateAttributes({expected: value.slice(0, 1000)})} width="20rem" />
        <RemoveButton props={props} label="Remove this step" />
      </div>
    </NodeViewWrapper>
  );
}

// ---- References ---------------------------------------------------------------------------------------

function ReferenceListView(props: ReactNodeViewProps) {
  return (
    <NodeViewWrapper className="cs-references-wrap">
      <NodeViewContent<'ul'> as="ul" className="cs-references" />
      <AddButton label="Add reference" onClick={() => appendChild(props, {type: 'reference'})} />
    </NodeViewWrapper>
  );
}

function ReferenceView(props: ReactNodeViewProps) {
  const {url, kind} = props.node.attrs as {url: string; kind: string};
  return (
    <NodeViewWrapper as="li" className="cs-reference write-reference" data-kind={kind}>
      <NodeViewContent<'span'> as="span" className="cs-reference-title" />
      <div className="cs-reference-facts write-row" contentEditable={false}>
        <Field label="Link" placeholder="https://" value={url} onChange={value => props.updateAttributes({url: value.trim().slice(0, 2000)})} width="16rem" />
        <Selector label="Kind of reference" isLabelHidden size="sm" options={REFERENCE_KINDS} value={kind} onChange={value => props.updateAttributes({kind: value})} />
        <RemoveButton props={props} label="Remove this reference" />
      </div>
    </NodeViewWrapper>
  );
}

// ---- Registration ---------------------------------------------------------------------------------------

/** Enter starts the next item of a list-like block (Tiptap's splitListItem works for any item type). */
const listItemKeys = (name: string) => ({
  Enter: ({editor}: {editor: Editor}) => editor.commands.splitListItem(name),
  'Shift-Tab': ({editor}: {editor: Editor}) => editor.commands.liftListItem(name),
});

export const structuredEditorNodes = [
  StudioCodeBlock.extend({addNodeView: () => ReactNodeViewRenderer(CodeBlockView)}),
  TerminalNode.extend({addNodeView: () => ReactNodeViewRenderer(TerminalView)}),
  TerminalCommandNode.extend({addKeyboardShortcuts: () => ({'Mod-Enter': ({editor}) => nextTerminalLine(editor)})}),
  TerminalOutputNode.extend({addKeyboardShortcuts: () => ({'Mod-Enter': ({editor}) => nextTerminalLine(editor)})}),
  ApiEndpointNode.extend({addNodeView: () => ReactNodeViewRenderer(ApiEndpointView)}),
  ParameterTableNode.extend({addNodeView: () => ReactNodeViewRenderer(ParameterTableView)}),
  ParameterNode.extend({addNodeView: () => ReactNodeViewRenderer(ParameterView), addKeyboardShortcuts: () => listItemKeys('parameter')}),
  RequirementListNode.extend({addNodeView: () => ReactNodeViewRenderer(RequirementListView)}),
  RequirementNode.extend({addNodeView: () => ReactNodeViewRenderer(RequirementView), addKeyboardShortcuts: () => listItemKeys('requirement')}),
  UserStoryNode.extend({addNodeView: () => ReactNodeViewRenderer(UserStoryView)}),
  StoryPartNode.extend({addNodeView: () => ReactNodeViewRenderer(StoryPartView), addKeyboardShortcuts: () => ({Enter: ({editor}) => nextStoryPart(editor)})}),
  AcceptanceCriteriaNode.extend({addNodeView: () => ReactNodeViewRenderer(AcceptanceCriteriaView)}),
  ScenarioNode.extend({addNodeView: () => ReactNodeViewRenderer(ScenarioView)}),
  ScenarioStepNode.extend({addNodeView: () => ReactNodeViewRenderer(ScenarioStepView), addKeyboardShortcuts: () => ({Enter: ({editor}) => nextScenarioStep(editor)})}),
  TestimonialNode.extend({addNodeView: () => ReactNodeViewRenderer(TestimonialView)}),
  ProcedureStepsNode.extend({addNodeView: () => ReactNodeViewRenderer(ProcedureStepsView)}),
  ProcedureStepNode.extend({addNodeView: () => ReactNodeViewRenderer(ProcedureStepView), addKeyboardShortcuts: () => listItemKeys('procedureStep')}),
  ReferenceListNode.extend({addNodeView: () => ReactNodeViewRenderer(ReferenceListView)}),
  ReferenceNode.extend({addNodeView: () => ReactNodeViewRenderer(ReferenceView)}),
];

/** What each new block is when inserted (contract §3.2 `insert.create`): the same JSON from Insert, "/" and recommendations. */
export const STRUCTURED_CREATE: Record<string, () => JSONContent> = {
  terminal: () => ({type: 'terminal', attrs: {shell: 'bash', prompt: '$'}, content: [{type: 'terminalCommand'}]}),
  apiEndpoint: () => ({
    type: 'apiEndpoint',
    attrs: {
      method: 'GET',
      path: '/api/v1/resource',
      summary: '',
      auth: 'bearer',
      requestType: 'application/json',
      requestBody: '{\n  \n}',
      responseStatus: '200 OK',
      responseBody: '{\n  \n}',
    },
    content: [{type: 'paragraph'}],
  }),
  parameterTable: () => ({type: 'parameterTable', attrs: {showRequired: true, showDefault: true}, content: [{type: 'parameter', content: [{type: 'paragraph'}]}]}),
  requirementList: () => ({type: 'requirementList', content: [{type: 'requirement', content: [{type: 'paragraph'}]}]}),
  userStory: () => ({type: 'userStory', content: (['role', 'goal', 'benefit'] as const).map(part => ({type: 'storyPart', attrs: {part}}))}),
  acceptanceCriteria: () => ({type: 'acceptanceCriteria', content: [newScenario()]}),
  testimonial: () => ({type: 'testimonial', attrs: {consent: 'none'}, content: [{type: 'paragraph'}]}),
  procedureSteps: () => ({type: 'procedureSteps', content: [{type: 'procedureStep', content: [{type: 'paragraph'}]}]}),
  referenceList: () => ({type: 'referenceList', content: [{type: 'reference'}]}),
};

/** Hints shown in empty parts of the new blocks (never stored). */
export function structuredPlaceholder(node: PMNode, parent: PMNode | null, isFirstChild: boolean): string | undefined {
  switch (node.type.name) {
    case 'terminalCommand':
      return 'A command';
    case 'terminalOutput':
      return 'What it prints';
    case 'storyPart':
      return ({role: 'who the user is', goal: 'what they want to do', benefit: 'why it matters to them'} as Record<string, string>)[String(node.attrs.part)];
    case 'scenarioStep':
      return ({given: 'the starting situation', when: 'what the person does', then: 'what should happen', and: 'another condition or result', but: 'an exception'} as Record<string, string>)[String(node.attrs.keyword)];
    case 'reference':
      return 'Title of the document or page';
    case 'codeBlock':
      return 'Code';
    case 'apiEndpoint':
      return 'Endpoint description or notes';
  }
  if (node.type.name !== 'paragraph' || !parent || !isFirstChild || parent.childCount !== 1) return undefined;
  return (
    {
      requirement: 'What the system must do',
      procedureStep: 'What to do in this step',
      testimonial: 'The customer’s exact words',
      parameter: 'What it does',
      apiEndpoint: 'Detailed description or notes about this endpoint',
    } as Record<string, string>
  )[parent.type.name];
}
