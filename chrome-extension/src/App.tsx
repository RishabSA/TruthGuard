import { useEffect, useRef, useState } from "react";
import {
	Award,
	FileText,
	GitHub,
	Globe,
	Info,
	Link,
	Linkedin,
	Monitor,
	Moon,
	RefreshCw,
	Shield,
	Sun,
	UploadCloud,
	X,
	Zap,
} from "react-feather";
import type { Icon } from "react-feather";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Tesseract from "tesseract.js";

type TabId = "TEXT" | "URL" | "IMAGE";
type ThemeId = "Light" | "Dark" | "System";
type LoadingType = "detect" | "extract";

interface Tab {
	id: TabId;
	label: string;
	Icon: Icon;
}

interface ThemeOption {
	id: ThemeId;
	Icon: Icon;
}

interface Verdict {
	label: string;
	sub: string;
	ring: string;
	text: string;
	bg: string;
	border: string;
}

interface ImageLoadingStatus {
	status: string;
	progress: number;
}

const TABS: Tab[] = [
	{ id: "TEXT", label: "Text", Icon: FileText },
	{ id: "URL", label: "URL", Icon: Link },
	{ id: "IMAGE", label: "Image", Icon: UploadCloud },
];

const THEME_OPTIONS: ThemeOption[] = [
	{ id: "Light", Icon: Sun },
	{ id: "Dark", Icon: Moon },
	{ id: "System", Icon: Monitor },
];

function App() {
	const [theme, setTheme] = useState<ThemeId>(() => {
		return (localStorage.getItem("theme") as ThemeId) || "System";
	});
	const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
	const [url, setUrl] = useState<string>("");
	const [text, setText] = useState<string>("");
	const [selectedItem, setSelectedItem] = useState<TabId>("TEXT");
	const [probability, setProbability] = useState<number | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [loadingType, setLoadingType] = useState<LoadingType | null>(null);
	const [imageLoadingStatus, setImageLoadingStatus] =
		useState<ImageLoadingStatus | null>(null);
	const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
	const dropdownRef = useRef<HTMLDivElement | null>(null);

	const serverURL = import.meta.env.VITE_SERVER_URL;

	useEffect(() => {
		const root = document.documentElement;

		if (theme === "Dark") {
			root.classList.add("dark");
		} else if (theme === "Light") {
			root.classList.remove("dark");
		} else {
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}

		localStorage.setItem("theme", theme);
	}, [theme]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent): void {
			if (
				dropdownOpen &&
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setDropdownOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [dropdownOpen]);

	useEffect(() => {
		function handleEsc(event: KeyboardEvent): void {
			if (event.key === "Escape") {
				setIsModalOpen(false);
				setDropdownOpen(false);
			}
		}
		document.addEventListener("keydown", handleEsc);
		return () => document.removeEventListener("keydown", handleEsc);
	}, []);

	const handleImageUpload = (
		event: React.ChangeEvent<HTMLInputElement>,
	): void => {
		const file = event.target.files?.[0];

		if (file) {
			const fileUrl = URL.createObjectURL(file);
			handleExtractImageText(fileUrl);
		}
	};

	const handleExtractImageText = async (imageUrl: string): Promise<void> => {
		setText("");
		setLoading(true);
		setLoadingType("extract");

		try {
			const {
				data: { text: extractedText },
			} = await Tesseract.recognize(imageUrl, "eng", {
				logger: (info: { status: string; progress: number }) => {
					if (info) {
						setImageLoadingStatus({
							status: info.status,
							progress: info.progress,
						});
					}
				},
			});

			setText(extractedText);
		} catch (error) {
			console.error(error);
			toast.error("Something went wrong. Please try again later.");
		} finally {
			setLoadingType(null);
			setImageLoadingStatus(null);
			setLoading(false);
		}
	};

	const isDetectDisabled: boolean =
		(["TEXT", "IMAGE"].includes(selectedItem) && !text.trim()) ||
		(selectedItem === "URL" && !url.trim());

	const getUrlText = async (articleUrl: string): Promise<string> => {
		try {
			const res = await fetch(`${serverURL}/scrape`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url: articleUrl }),
			});

			if (!res.ok) throw new Error(await res.text());
			const { text: scraped } = (await res.json()) as { text: string };
			return scraped;
		} catch (e) {
			console.error("scrape failed", e);
			toast.error("Could not fetch article text");
			return "";
		}
	};

	const detect = async (): Promise<void> => {
		setProbability(null);
		setLoading(true);
		setLoadingType("detect");

		try {
			let inputText = "";
			if (selectedItem === "TEXT" || selectedItem === "IMAGE") {
				inputText = text;
			} else if (selectedItem === "URL") {
				inputText = await getUrlText(url);
			}
			if (!inputText) {
				toast.error("No text to analyze");
				return;
			}
			const res = await fetch(`${serverURL}/predict`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: inputText }),
			});

			if (!res.ok) throw new Error(await res.text());
			const { probability: prob } = (await res.json()) as {
				probability: number;
			};

			setProbability(prob);
		} catch (err) {
			console.error(err);
			toast.error("Inference failed");
		} finally {
			setLoadingType(null);
			setLoading(false);
		}
	};

	const resetResult = (): void => {
		setProbability(null);
		setText("");
		setUrl("");
	};

	const verdict: Verdict | null =
		probability === null
			? null
			: probability < 0.4
				? {
						label: "Likely Fake",
						sub: "Low credibility signal",
						ring: "stroke-red-500",
						text: "text-red-600 dark:text-red-400",
						bg: "bg-red-50 dark:bg-red-950/40",
						border: "border-red-200 dark:border-red-900",
					}
				: probability < 0.7
					? {
							label: "Uncertain",
							sub: "Mixed credibility signal",
							ring: "stroke-amber-400",
							text: "text-amber-600 dark:text-amber-400",
							bg: "bg-amber-50 dark:bg-amber-950/40",
							border: "border-amber-200 dark:border-amber-900",
						}
					: {
							label: "Likely Real",
							sub: "Strong credibility signal",
							ring: "stroke-emerald-500",
							text: "text-emerald-600 dark:text-emerald-400",
							bg: "bg-emerald-50 dark:bg-emerald-950/40",
							border: "border-emerald-200 dark:border-emerald-900",
						};

	const ActiveThemeIcon: Icon =
		THEME_OPTIONS.find(t => t.id === theme)?.Icon ?? Monitor;

	return (
		<div className="relative min-h-dvh bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 overflow-x-hidden">
			{loading && (
				<div className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-all ease-in-out duration-300">
					<div role="status">
						<svg
							aria-hidden="true"
							className="inline w-20 h-20 animate-spin text-neutral-300/30 fill-blue-500"
							viewBox="0 0 100 101"
							fill="none"
							xmlns="http://www.w3.org/2000/svg">
							<path
								d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
								fill="currentColor"
							/>
							<path
								d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
								fill="currentFill"
							/>
						</svg>
					</div>
					{loadingType === "detect" && (
						<div className="mt-6 flex flex-col items-center">
							<span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-medium text-sm border border-blue-500/20">
								<Zap size={14} />
								Analyzing · ~30 seconds
							</span>
						</div>
					)}
					{loadingType === "extract" && imageLoadingStatus && (
						<div className="w-72 md:w-96 flex flex-col items-center mt-8">
							<div className="w-full bg-neutral-700/40 rounded-full h-1.5 overflow-hidden">
								<div
									className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-200"
									style={{
										width: `${imageLoadingStatus.progress * 100}%`,
									}}
								/>
							</div>
							<span className="mt-4 inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-300 font-medium text-sm border border-blue-500/20">
								{imageLoadingStatus.status.replace(/\b\w/g, c =>
									c.toUpperCase(),
								)}
							</span>
						</div>
					)}
				</div>
			)}

			<div
				tabIndex={-1}
				aria-hidden={!isModalOpen}
				onClick={() => setIsModalOpen(false)}
				className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
					isModalOpen
						? "bg-black/60 backdrop-blur-sm pointer-events-auto opacity-100"
						: "bg-black/0 pointer-events-none opacity-0"
				}`}>
				<div
					onClick={e => e.stopPropagation()}
					role="dialog"
					aria-modal="true"
					className={`relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 transform transition-all duration-300 ${
						isModalOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
					}`}>
					<div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
						<div className="flex items-center gap-3">
							<div className="h-9 w-9 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
								<Info size={18} className="text-blue-600 dark:text-blue-400" />
							</div>
							<h3 className="text-lg font-semibold">About TruthGuard</h3>
						</div>
						<button
							type="button"
							aria-label="Close"
							className="cursor-pointer h-9 w-9 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
							onClick={() => setIsModalOpen(false)}>
							<X size={18} />
						</button>
					</div>
					<div className="px-6 py-5 space-y-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
						<p>
							TruthGuard is an AI-powered fake news detector that identifies
							misinformation and bias to combat the spread of false information
							— empowering you to separate fact from fiction.
						</p>
						<p>
							Built by Rishab Alagharu, TruthGuard won the 2023 Congressional
							App Challenge. The model is a Transformer Encoder with a
							classification head, trained in PyTorch and served via ONNX
							Runtime.
						</p>
					</div>
					<div className="px-6 pb-6 space-y-2">
						<a
							href="https://www.linkedin.com/in/rishab-alagharu"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center justify-between w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer">
							<div className="flex items-center gap-3">
								<Linkedin
									size={20}
									className="text-blue-600 dark:text-blue-400"
								/>
								<span className="font-medium">LinkedIn</span>
							</div>
							<ArrowIcon />
						</a>
						<a
							href="https://rishabalagharu.com/"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center justify-between w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer">
							<div className="flex items-center gap-3">
								<Globe
									size={20}
									className="text-emerald-600 dark:text-emerald-400"
								/>
								<span className="font-medium">Personal Website</span>
							</div>
							<ArrowIcon />
						</a>
						<a
							href="https://github.com/RishabSA"
							target="_blank"
							rel="noopener noreferrer"
							className="group flex items-center justify-between w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all cursor-pointer">
							<div className="flex items-center gap-3">
								<GitHub
									size={20}
									className="text-neutral-800 dark:text-neutral-200"
								/>
								<span className="font-medium">GitHub</span>
							</div>
							<ArrowIcon />
						</a>
					</div>
				</div>
			</div>

			<ToastContainer
				position="top-right"
				autoClose={5000}
				hideProgressBar={false}
				newestOnTop={false}
				closeOnClick={false}
				rtl={false}
				pauseOnFocusLoss
				draggable={false}
				pauseOnHover
				theme="colored"
				transition={Bounce}
			/>

			<div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-16">
				<header className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img
							src="/TruthGuardIcon.svg"
							alt="TruthGuard"
							className="h-11 w-auto"
						/>
						<div className="flex flex-col">
							<h1 className="text-2xl md:text-3xl font-bold tracking-tight flex">
								TruthGuard
							</h1>
							<span className="hidden md:inline text-xs text-neutral-500 dark:text-neutral-400">
								AI-powered misinformation detection
							</span>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<div ref={dropdownRef} className="relative">
							<button
								onClick={() => setDropdownOpen(o => !o)}
								aria-haspopup="menu"
								aria-expanded={dropdownOpen}
								className="cursor-pointer h-10 px-3 inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
								<ActiveThemeIcon size={16} />
								<span className="hidden sm:inline">{theme}</span>
							</button>
							{dropdownOpen && (
								<div
									role="menu"
									className="absolute right-0 mt-2 w-36 z-20 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-lg overflow-hidden">
									{THEME_OPTIONS.map(({ id, Icon }) => (
										<button
											key={id}
											onClick={() => {
												setTheme(id);
												setDropdownOpen(false);
											}}
											className={`cursor-pointer w-full px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2 transition-colors ${
												theme === id
													? "text-blue-600 dark:text-blue-400 font-medium"
													: "text-neutral-700 dark:text-neutral-300"
											}`}>
											<Icon size={16} />
											{id}
										</button>
									))}
								</div>
							)}
						</div>

						<button
							type="button"
							aria-label="About TruthGuard"
							title="About"
							className="cursor-pointer h-10 w-10 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
							onClick={() => setIsModalOpen(true)}>
							<Info size={18} />
						</button>
					</div>
				</header>

				<section className="mt-8 md:mt-12 flex flex-col items-center text-center">
					<h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl">
						Separate{" "}
						<span className="text-blue-600 dark:text-blue-500 bg-clip-text">
							fact from fiction
						</span>
					</h2>
					<a
						href="https://www.congressionalappchallenge.us/23-ga05/"
						target="_blank"
						rel="noopener noreferrer"
						className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 text-green-700 dark:text-green-300 text-sm font-semibold hover:bg-green-500/15 transition-colors cursor-pointer">
						<Award size={14} />
						2023 Congressional App Challenge Winner
					</a>
				</section>

				<div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
					<div className="lg:col-span-3">
						<div className="rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6">
							<p className="mb-4 text-sm md:text-base text-neutral-600 dark:text-neutral-400 max-w-xl">
								Paste an article, add a URL, or upload a screenshot.
							</p>
							<div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800">
								{TABS.map(({ id, label, Icon }) => {
									const active = selectedItem === id;
									return (
										<button
											key={id}
											onClick={() => setSelectedItem(id)}
											className={`cursor-pointer inline-flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
												active
													? "bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 shadow-sm"
													: "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
											}`}
											aria-pressed={active}>
											<Icon size={16} />
											{label}
										</button>
									);
								})}
							</div>

							<div className="mt-5">
								{selectedItem === "TEXT" && (
									<div>
										<label
											htmlFor="text-input"
											className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
											Article text
										</label>
										<textarea
											id="text-input"
											placeholder="Paste a news article here..."
											value={text}
											onChange={event => setText(event.target.value)}
											className="transition-all text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 w-full resize-none h-48 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent selection:bg-blue-200 dark:selection:bg-blue-700/60"
										/>
										<div className="mt-1.5 flex justify-between text-xs text-neutral-500">
											<span>
												Longer passages are more likely to produce reliable
												scores
											</span>
											<span>{text.length.toLocaleString()} chars</span>
										</div>
									</div>
								)}

								{selectedItem === "URL" && (
									<div>
										<label
											htmlFor="url-input"
											className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
											Article URL
										</label>
										<div className="relative">
											<Link
												size={16}
												className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
											/>
											<input
												id="url-input"
												type="url"
												placeholder="https://example.com/news/article"
												value={url}
												onChange={event => setUrl(event.target.value)}
												className="transition-all text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 w-full bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
											/>
										</div>
										<p className="mt-1.5 text-xs text-neutral-500">
											The article text will automatically be fetched.
										</p>
									</div>
								)}

								{selectedItem === "IMAGE" && (
									<div>
										<label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
											Screenshot
										</label>
										<label
											htmlFor="image-dropzone"
											className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-50 dark:bg-neutral-900 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 hover:border-blue-400 dark:hover:border-blue-600 transition-colors ${
												loading
													? "opacity-50 cursor-not-allowed"
													: "cursor-pointer"
											}`}>
											<div className="flex items-center gap-3">
												<div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
													<UploadCloud
														size={20}
														className="text-blue-600 dark:text-blue-400"
													/>
												</div>
												<div className="text-left">
													<p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
														Click to upload or drag and drop
													</p>
													<p className="text-xs text-neutral-500 dark:text-neutral-400">
														PNG, JPG, or JPEG
													</p>
												</div>
											</div>
											<input
												id="image-dropzone"
												type="file"
												accept=".png, .jpg, .jpeg"
												className="hidden"
												multiple={false}
												disabled={loading}
												onChange={handleImageUpload}
											/>
										</label>

										<textarea
											placeholder="Text extracted from the image will appear here..."
											value={text}
											onChange={event => setText(event.target.value)}
											className="mt-3 transition-all text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 w-full resize-none h-32 bg-neutral-50 dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										/>
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={detect}
								disabled={isDetectDisabled}
								className={`mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl text-white font-semibold text-base transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 ${
									isDetectDisabled
										? "bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-500 cursor-not-allowed"
										: "bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-lg cursor-pointer active:scale-[0.99] motion-reduce:active:scale-100"
								}`}>
								<Shield size={18} />
								Detect
							</button>

							<p className="mt-3 text-xs text-center text-neutral-500 dark:text-neutral-400">
								⚠️ TruthGuard is an AI tool. Always verify information from
								multiple sources.
							</p>
						</div>
					</div>

					<div className="lg:col-span-2">
						<div className="h-full rounded-2xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 md:p-6 flex flex-col">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">
									Result
								</h3>
								{probability !== null && (
									<button
										type="button"
										onClick={resetResult}
										className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors">
										<RefreshCw size={12} />
										Reset
									</button>
								)}
							</div>

							{probability === null ? (
								<div className="flex-1 flex flex-col items-center justify-center text-center py-10">
									<div className="h-14 w-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
										<Shield
											size={22}
											className="text-neutral-400 dark:text-neutral-500"
										/>
									</div>
									<p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
										Submit content to receive a credibility score
									</p>
									<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
										Scored on a 0 - 100 credibility scale
									</p>
								</div>
							) : (
								<div className="flex-1 flex flex-col items-center justify-center py-6">
									<div className="relative size-48">
										<svg
											className="rotate-[135deg] size-full"
											viewBox="0 0 36 36"
											xmlns="http://www.w3.org/2000/svg">
											<circle
												cx="18"
												cy="18"
												r="16"
												fill="none"
												className="stroke-neutral-200 dark:stroke-neutral-800"
												strokeWidth="2"
												strokeDasharray="75 100"
												strokeLinecap="round"
											/>
											<circle
												cx="18"
												cy="18"
												r="16"
												fill="none"
												className={`${verdict!.ring} transition-all duration-700 ease-out`}
												strokeWidth="2.5"
												strokeDasharray={`${probability * 100 * 0.75} 100`}
												strokeLinecap="round"
											/>
										</svg>
										<div className="absolute top-1/2 start-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
											<span
												className={`text-4xl font-bold tabular-nums ${verdict!.text}`}>
												{Math.round(probability * 100)}
												<span className="text-2xl">%</span>
											</span>
											<span className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
												credibility
											</span>
										</div>
									</div>

									<div
										className={`mt-4 inline-flex flex-col items-center px-4 py-2 rounded-xl border ${verdict!.bg} ${verdict!.border}`}>
										<span
											className={`text-sm font-semibold ${verdict!.text}`}>
											{verdict!.label}
										</span>
										<span className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
											{verdict!.sub}
										</span>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				<footer className="mt-12 text-center text-xs text-neutral-500 dark:text-neutral-500">
					Built by{" "}
					<a
						href="https://rishabalagharu.com/"
						target="_blank"
						rel="noopener noreferrer"
						className="underline decoration-dotted underline-offset-4 hover:text-neutral-800 dark:hover:text-neutral-300 transition-colors">
						Rishab Alagharu
					</a>
				</footer>
			</div>
		</div>
	);
}

function ArrowIcon(): React.ReactElement {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 group-hover:translate-x-0.5 transition-all">
			<line x1="5" y1="12" x2="19" y2="12" />
			<polyline points="12 5 19 12 12 19" />
		</svg>
	);
}

export default App;
