import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Image as ImageIcon, 
  Type, 
  BarChart3, 
  Download, 
  Terminal, 
  PlayCircle,
  CheckCircle2,
  Info
} from 'lucide-react';

const DocSection = ({ title, icon: Icon, children }) => (
  <section className="mb-16">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 bg-neutral-900 rounded-xl border border-white/5">
        <Icon size={24} className="text-white" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
    </div>
    <div className="space-y-4 text-neutral-400 leading-relaxed">
      {children}
    </div>
  </section>
);

const ModelDocCard = ({ title, type, format, requirement }) => (
  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
      <div className="size-2 rounded-full bg-white/20" /> {title}
    </h3>
    <div className="space-y-3 text-sm">
      <p><span className="text-neutral-500 font-medium uppercase text-[10px] tracking-widest block mb-1">Architecture</span> {type}</p>
      <p><span className="text-neutral-500 font-medium uppercase text-[10px] tracking-widest block mb-1">File Format</span> {format}</p>
      <div>
        <span className="text-neutral-500 font-medium uppercase text-[10px] tracking-widest block mb-1">Data Structure</span>
        <p className="text-neutral-300 bg-black/30 p-2 rounded border border-white/5 font-mono text-xs">
          {requirement}
        </p>
      </div>
    </div>
  </div>
);

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans selection:bg-neutral-700">
      {/* Header */}
      <div className="mx-auto max-w-5xl px-6 pt-12 pb-16">
        <button 
          onClick={() => navigate('/')} 
          className="group flex items-center gap-2 text-neutral-400 hover:text-white transition-colors mb-12"
        >
          <div className="rounded-full bg-neutral-900 p-2 group-hover:bg-neutral-800 transition-colors">
            <ArrowLeft size={20} />
          </div>
          <span className="font-medium">Back to Home</span>
        </button>

        <div className="flex items-center gap-4 mb-4">
          <BookOpen className="text-white" size={32} />
          <h1 className="text-5xl font-bold tracking-tight">Documentation</h1>
        </div>
        <p className="text-xl text-neutral-500 max-w-2xl">
          Learn how to prepare your datasets, train custom architectures, and integrate models into your Python environment.
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-32">
        <hr className="border-neutral-800 mb-16" />

        {/* Section 1: Data Preparation */}
        <DocSection title="1. Preparing Your Data" icon={ImageIcon}>
          <p>
            QuickTrain supports three primary model architectures. Each requires a specific data format to ensure the remote training job initializes correctly.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <ModelDocCard 
              title="ResNet-18"
              type="Computer Vision"
              format="Folder (.zip)"
              requirement="Root Folder > Class_A_Images & Class_B_Images"
            />
            <ModelDocCard 
              title="TinyBERT"
              type="NLP Classification"
              format=".csv / .json"
              requirement="Columns: ['text', 'label']"
            />
            <ModelDocCard 
              title="EBM"
              type="Tabular / InterpretML"
              format=".csv / .json"
              requirement="N-1 Features | Last Col: Target"
            />
          </div>
        </DocSection>

        {/* Section 2: The Training Process */}
        <DocSection title="2. Training Workflow" icon={PlayCircle}>
          <p>
            Once you upload your data, our backend triggers a remote GPU training instance. You can monitor the progress through your <strong>Dashboard</strong>.
          </p>
          <ul className="space-y-4 mt-4">
            <li className="flex gap-4">
              <CheckCircle2 className="text-neutral-500 shrink-0" size={20} />
              <span><strong>Auto-Split:</strong> By default, we split image datasets into 80% training and 20% validation. You can toggle this off to provide manual test sets.</span>
            </li>
            <li className="flex gap-4">
              <CheckCircle2 className="text-neutral-500 shrink-0" size={20} />
              <span><strong>Real-time Status:</strong> Your project will move from <span className="text-yellow-500 font-mono text-sm">Training</span> to <span className="text-green-500 font-mono text-sm">Complete</span> once the weights are exported to our secure storage.</span>
            </li>
          </ul>
        </DocSection>

        {/* Section 3: Implementation */}
        <DocSection title="3. Implementation" icon={Terminal}>
          <p>
            After training is finished, click <strong>"Use Model"</strong> on the Dashboard. This page provides a ready-to-use Python inference script tailored to your specific model.
          </p>
          
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 mt-6">
            <div className="flex items-center gap-3 mb-4 text-white">
              <Info size={18} className="text-neutral-500" />
              <span className="font-bold">Required Dependencies</span>
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono text-sm text-neutral-500">
              <div className="bg-black/50 p-3 rounded-xl border border-white/5">pip install torch torchvision</div>
              <div className="bg-black/50 p-3 rounded-xl border border-white/5">pip install transformers</div>
              <div className="bg-black/50 p-3 rounded-xl border border-white/5">pip install interpret pandas</div>
              <div className="bg-black/50 p-3 rounded-xl border border-white/5">pip install joblib</div>
            </div>
          </div>
        </DocSection>

        {/* Section 4: Downloads */}
        <DocSection title="4. Weights & Artifacts" icon={Download}>
          <p>
            You own your models. You can download the raw artifacts at any time:
          </p>
          <ul className="list-disc list-inside space-y-2 mt-4 ml-2">
            <li><strong>Vision:</strong> <code className="text-neutral-300">.pth</code> PyTorch state dictionary</li>
            <li><strong>NLP:</strong> <code className="text-neutral-300">.zip</code> containing config.json and safetensors</li>
            <li><strong>Tabular:</strong> <code className="text-neutral-300">.pkl</code> Joblib-serialized model</li>
          </ul>
        </DocSection>

        {/* CTA */}
        <div className="mt-20 p-12 rounded-[40px] bg-gradient-to-br from-neutral-800 to-neutral-950 border border-white/10 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to build?</h3>
          <p className="text-neutral-400 mb-8">Start by choosing an architecture on the home page.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-black px-10 py-4 rounded-full font-bold hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95"
          >
            Start Training Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default Documentation;