import { useEffect, useRef, useState } from "react";
import {
	ArrowRight,
	GitHub,
	Globe,
	Info,
	Linkedin,
	Monitor,
	Moon,
	Sun,
	UploadCloud,
	X,
} from "react-feather";
import { Bounce, ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Tesseract from "tesseract.js";

function App() {
	const [theme, setTheme] = useState(() => {
		return localStorage.getItem("theme") || "System";
	});
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [url, setUrl] = useState("");
	const [text, setText] = useState("");
	const [selectedItem, setSelectedItem] = useState("TEXT");
	const [probability, setProbability] = useState(null);
	const [loading, setLoading] = useState(false);
	const [loadingType, setLoadingType] = useState(null);
	const [imageLoadingStatus, setImageLoadingStatus] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const dropdownRef = useRef(null);

	const serverURL = import.meta.env.VITE_SERVER_URL;

	// Apply the theme whenever it changes
	useEffect(() => {
		const root = document.documentElement;

		if (theme === "Dark") {
			root.classList.add("dark");
		} else if (theme === "Light") {
			root.classList.remove("dark");
		} else {
			// System

			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}

		localStorage.setItem("theme", theme);
	}, [theme]);

	useEffect(() => {
		function handleClickOutside(event) {
			if (
				dropdownOpen &&
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target)
			) {
				setDropdownOpen(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [dropdownOpen]);

	const handleImageUpload = event => {
		const file = event.target.files[0];

		if (file) {
			const fileUrl = URL.createObjectURL(file);
			handleExtractImageText(fileUrl);
		}
	};

	const handleExtractImageText = async imageUrl => {
		setText("");
		setLoading(true);
		setLoadingType("extract");

		try {
			const {
				data: { text: extractedText },
			} = await Tesseract.recognize(imageUrl, "eng", {
				logger: info => {
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

	const isDetectDisabled =
		(["TEXT", "IMAGE"].includes(selectedItem) && !text.trim()) ||
		(selectedItem === "URL" && !url.trim());

	const getUrlText = async url => {
		try {
			const res = await fetch(`${serverURL}/scrape`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			});

			if (!res.ok) throw new Error(await res.text());
			const { text } = await res.json();
			return text;
		} catch (e) {
			console.error("scrape failed", e);
			toast.error("Could not fetch article text");
			return "";
		}
	};

	const detect = async () => {
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
			const { probability } = await res.json();

			setProbability(probability);
		} catch (err) {
			console.error(err);
			toast.error("Inference failed");
		} finally {
			setLoadingType(null);
			setLoading(false);
		}
	};

	const probColor =
		probability < 0.4
			? "text-red-600 dark:text-red-500"
			: probability < 0.7
			? "text-yellow-400 dark:text-yellow-500"
			: "text-green-500 dark:text-green-500";

	return (
		<div className="h-screen bg-neutral-100 dark:bg-neutral-900 flex flex-col items-center">
			{loading && (
				<div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 transition-all ease-in-out duration-300">
					<div role="status">
						<svg
							aria-hidden="true"
							className="inline w-24 h-24 animate-spin text-neutral-300 fill-blue-600"
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
						<div className="mt-5 flex flex-col items-center">
							<span className="inline-block px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-lg shadow">
								Estimated Time: <span className="font-bold">10 seconds</span>
							</span>
						</div>
					)}
					{loadingType === "extract" && imageLoadingStatus && (
						<div className="w-1/4 flex flex-col items-center">
							<div className="w-full mt-10 mb-5 bg-neutral-300 rounded-full h-2.5">
								<div
									className="bg-blue-600 h-2.5 rounded-full"
									style={{
										width: `${imageLoadingStatus.progress * 100}%`,
									}}></div>
							</div>
							<span className="inline-block px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold text-lg shadow">
								{imageLoadingStatus.status.replace(/\b\w/g, c =>
									c.toUpperCase()
								)}
							</span>
						</div>
					)}
				</div>
			)}

			<div
				tabIndex="-1"
				aria-hidden="true"
				onClick={() => setIsModalOpen(false)}
				className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
					isModalOpen
						? "bg-black/50 pointer-events-auto opacity-100"
						: "bg-black/0 pointer-events-none opacity-0"
				}`}>
				<div
					onClick={e => e.stopPropagation()}
					className={`relative p-4 w-full max-w-xs md:max-w-2xl max-h-full bg-white rounded-lg shadow-sm dark:bg-neutral-800 transform transition-transform duration-300 ${
						isModalOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
					}`}>
					<div className="relative bg-white rounded-lg shadow-sm dark:bg-neutral-800">
						<div className="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-neutral-600 border-neutral-200">
							<h3 className="flex items-center text-xl font-semibold text-neutral-900 dark:text-white">
								<Info
									size={24}
									strokeWidth={2}
									className="stroke-current text-neutral-500 dark:text-neutral-300 mr-4"
								/>
								Info
							</h3>
							<button
								type="button"
								className="cursor-pointer text-neutral-400 bg-transparent hover:bg-neutral-200 hover:text-neutral-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-neutral-600 dark:hover:text-white"
								onClick={() => setIsModalOpen(false)}>
								<X
									size={24}
									strokeWidth={2}
									className="stroke-current text-neutral-500 dark:text-neutral-400"
								/>
							</button>
						</div>
						<div className="p-4 md:p-5 space-y-4">
							<p className="text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
								TruthGuard is an AI-powered fake news detector that detects
								misinformation and bias to combat the spread of misinformation.
								TruthGuard empowers you to separate fact from fiction and
								protect the trustworthiness of the information you consume.
							</p>
							<p className="text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
								Hi! My name is Rishab Alagharu, and I am the creator of
								TruthGuard. TruthGuard is a winner of the 2023 Congressional App
								Challenge! I built the TruthGuard AI model using PyTorch and the
								frontend using React JS and Tailwind CSS. The model architecture
								consists of a Transformer Encoder with a classification head.
							</p>
							<p className="text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
								See my personal links below to learn more about me and my work
								or get in contact with me!
							</p>
							<ul className="space-y-4 mb-4">
								<li>
									<label
										onClick={() =>
											window.open(
												"https://www.linkedin.com/in/rishab-alagharu",
												"_blank"
											)
										}
										className="transition-all inline-flex items-center justify-between w-full px-4 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg cursor-pointer dark:hover:text-neutral-300 dark:border-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-white dark:bg-neutral-800 dark:hover:bg-neutral-700">
										<div className="flex items-center space-x-4">
											<Linkedin
												size={24}
												className="stroke-current text-blue-700 dark:text-blue-500"
											/>
											<div className="w-full text-lg font-semibold">
												LinkedIn
											</div>
										</div>
										<ArrowRight
											size={20}
											strokeWidth={3}
											className="stroke-current text-neutral-500 dark:text-neutral-400"
										/>
									</label>
								</li>
								<li>
									<label
										onClick={() =>
											window.open("https://rishabalagharu.com/", "_blank")
										}
										className="transition-all inline-flex items-center justify-between w-full px-4 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg cursor-pointer dark:hover:text-neutral-300 dark:border-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-white dark:bg-neutral-800 dark:hover:bg-neutral-700">
										<div className="flex items-center space-x-4">
											<Globe
												size={24}
												className="stroke-current text-green-500 dark:text-green-400"
											/>
											<div className="w-full text-lg font-semibold">
												Personal Website
											</div>
										</div>
										<ArrowRight
											size={20}
											strokeWidth={3}
											className="stroke-current text-neutral-500 dark:text-neutral-400"
										/>
									</label>
								</li>
								<li>
									<label
										onClick={() =>
											window.open("https://github.com/RishabSA", "_blank")
										}
										className="transition-all inline-flex items-center justify-between w-full px-4 py-2 text-neutral-900 bg-white border border-neutral-200 rounded-lg cursor-pointer dark:hover:text-neutral-300 dark:border-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-white dark:bg-neutral-800 dark:hover:bg-neutral-700">
										<div className="flex items-center space-x-4">
											<GitHub
												size={24}
												className="stroke-current text-neutral-800 dark:text-neutral-300"
											/>

											<div className="w-full text-lg font-semibold">Github</div>
										</div>
										<ArrowRight
											size={20}
											strokeWidth={3}
											className="stroke-current text-neutral-500 dark:text-neutral-400"
										/>
									</label>
								</li>
							</ul>
						</div>
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
			<div className="mt-[2vh] md:flex md:space-x-20 items-center justify-center">
				<div className="flex items-center space-x-4 justify-center">
					<img
						src="/TruthGuardIcon.svg"
						alt="TruthGuard Icon"
						className="h-20 w-auto"
					/>
					<h1 className="text-5xl text-black dark:text-white">TruthGuard</h1>
				</div>

				<div className="flex items-center space-x-4 mt-5 md:mt-0 justify-center">
					<div>
						<div ref={dropdownRef} className="relative">
							<button
								onClick={() => setDropdownOpen(o => !o)}
								className="cursor-pointer text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800 font-medium rounded-lg text-sm px-5 py-2.5 inline-flex items-center">
								{theme === "Light" && <Sun size={16} className="mr-2" />}
								{theme === "Dark" && <Moon size={16} className="mr-2" />}
								{theme === "System" && <Monitor size={16} className="mr-2" />}
								<span>{theme}</span>
							</button>
							{dropdownOpen && (
								<div className="transition-all duration-300 ease-in-out absolute z-10 bg-white dark:bg-neutral-800 rounded-lg">
									<ul className="py-2 text-sm text-neutral-600 dark:text-neutral-400">
										<li>
											<button
												onClick={() => {
													setTheme("Light");
													setDropdownOpen(false);
												}}
												className="cursor-pointer w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
												<Sun size={16} className="mr-2" />
												Light
											</button>
										</li>
										<li>
											<button
												onClick={() => {
													setTheme("Dark");
													setDropdownOpen(false);
												}}
												className="cursor-pointer w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
												<Moon size={16} className="mr-2" />
												Dark
											</button>
										</li>
										<li>
											<button
												onClick={() => {
													setTheme("System");
													setDropdownOpen(false);
												}}
												className="cursor-pointer w-full px-4 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center">
												<Monitor size={16} className="mr-2" />
												System
											</button>
										</li>
									</ul>
								</div>
							)}
						</div>
					</div>
					<button
						type="button"
						aria-label="Open information panel"
						title="Info"
						className="cursor-pointer h-10 w-10 text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-800 flex items-center justify-center rounded-lg transition-colors"
						onClick={() => setIsModalOpen(true)}>
						<div className="flex items-center">
							<Info
								size={24}
								strokeWidth={2}
								className="stroke-current text-neutral-500 dark:text-neutral-300"
							/>
						</div>
					</button>
				</div>
			</div>
			<div className="pb-8 mt-5 w-full md:w-1/2 flex flex-col justify-start items-center border-neutral-200 dark:border-neutral-800 border-2 rounded-xl">
				<div className="flex justify-center w-2/3 mb-5">
					<button
						onClick={() => setSelectedItem("TEXT")}
						className={`cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all text-neutral-700 dark:text-neutral-300 w-1/3 text-xl border-b-2 p-2 pt-4 ${
							selectedItem === "TEXT"
								? "border-b-neutral-500 dark:border-b-neutral-300 font-bold"
								: "border-b-neutral-200 dark:border-b-neutral-700 opacity-75"
						}`}>
						Text
					</button>
					<button
						onClick={() => setSelectedItem("URL")}
						className={`cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all text-neutral-700 dark:text-neutral-300 w-1/3 text-xl border-b-2 p-2 pt-4 ${
							selectedItem === "URL"
								? "border-b-neutral-500 dark:border-b-neutral-300 font-bold"
								: "border-b-neutral-200 dark:border-b-neutral-700 opacity-75"
						}`}>
						URL
					</button>
					<button
						onClick={() => setSelectedItem("IMAGE")}
						className={`cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-all text-neutral-700 dark:text-neutral-300 w-1/3 text-xl border-b-2 p-2 pt-4 ${
							selectedItem === "IMAGE"
								? "border-b-neutral-500 dark:border-b-neutral-300 font-bold"
								: "border-b-neutral-200 dark:border-b-neutral-700 opacity-75"
						}`}>
						Image
					</button>
				</div>
				<div className="flex justify-center w-11/12 md:w-2/3">
					{selectedItem === "TEXT" ? (
						<textarea
							placeholder="Paste a news article here..."
							value={text}
							onChange={event => setText(event.target.value)}
							className="transition-all text-black dark:text-white placeholder-neutral-500 border-neutral-300 dark:border-neutral-700 border-2 rounded-xl px-4 py-3 w-full resize-none h-[150px] bg-neutral-100 dark:bg-neutral-900 selection:bg-blue-200 dark:selection:bg-blue-700"
						/>
					) : selectedItem === "URL" ? (
						<input
							placeholder="Paste a news article url here..."
							value={url}
							onChange={event => setUrl(event.target.value)}
							className="transition-all text-black dark:text-white border-neutral-300 dark:border-neutral-700 border-2 rounded-xl p-5 w-full resize-none h-12 bg-neutral-100 dark:bg-neutral-900 selection:bg-blue-200 dark:selection:bg-blue-700"
						/>
					) : (
						<div className="flex flex-col items-center w-full">
							<div
								className={`flex items-center justify-center w-full mb-2 ${
									loading && "opacity-50 cursor-not-allowed"
								}`}>
								<label
									htmlFor="image-dropzone"
									className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
									<div className="flex flex-col items-center justify-center space-y-2">
										<div className="flex items-center justify-center">
											<UploadCloud
												size={24}
												strokeWidth={2}
												className="stroke-current text-neutral-500 dark:text-neutral-400"
											/>
											<div className="text-center ml-4">
												<p className="text-sm text-neutral-600 dark:text-neutral-300">
													Click to upload or drag and drop
												</p>
												<p className="text-xs text-neutral-500 dark:text-neutral-400">
													PNG, JPG, or JPEG
												</p>
											</div>
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
							</div>

							<textarea
								placeholder="Text in the image will appear here..."
								value={text}
								onChange={event => setText(event.target.value)}
								className="transition-all text-black dark:text-white placeholder-neutral-500 border-neutral-300 dark:border-neutral-700 border-2 rounded-xl px-4 py-3 w-full resize-none h-[150px] bg-neutral-100 dark:bg-neutral-900 selection:bg-blue-200 dark:selection:bg-blue-700"
							/>
						</div>
					)}
				</div>
				<div className="flex justify-center w-11/12 md:w-2/3">
					<button
						className={`
							border-neutral-300 dark:border-neutral-700 border-2 rounded-xl p-2 w-full
							bg-neutral-100 dark:bg-neutral-900 mt-2 text-xl font-semibold
							text-neutral-600 dark:text-neutral-300 transition-transform transform
							${
								isDetectDisabled
									? "opacity-50 cursor-not-allowed"
									: "cursor-pointer hover:scale-105 hover:bg-neutral-200 dark:hover:bg-neutral-800"
							}
						`}
						onClick={detect}
						disabled={isDetectDisabled}>
						DETECT
					</button>
				</div>
				<div className="flex justify-center w-11/12 md:w-2/3 mt-2">
					<div className="w-full mt-2 text-yellow-500 dark:text-yellow-300 text-center text-xs">
						⚠️ TruthGuard is an AI tool. Always verify information from multiple
						sources.
					</div>
				</div>
			</div>
			{probability !== null && (
				<div className="relative size-52 mt-5">
					<svg
						className="rotate-[135deg] size-full"
						viewBox="0 0 36 36"
						xmlns="http://www.w3.org/2000/svg">
						<circle
							cx="18"
							cy="18"
							r="16"
							fill="none"
							className="stroke-current text-neutral-300 dark:text-neutral-700"
							strokeWidth="1"
							strokeDasharray="75 100"
							strokeLinecap="round"></circle>

						<circle
							cx="18"
							cy="18"
							r="16"
							fill="none"
							className={`stroke-current ${probColor}`}
							strokeWidth="2"
							strokeDasharray={`${probability * 100 * 0.75} 100`}
							strokeLinecap="round"></circle>
					</svg>

					<div className="absolute top-1/2 start-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
						<span className={`text-4xl font-bold ${probColor}`}>
							{Math.round(probability * 100)}%
						</span>
						<span className={`text-xl ${probColor} block`}>
							{probability > 0.5 ? "Real" : "Fake"}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
