words = []

folder_name = "/Users/dzd123/Downloads/EOWL-v1.1.2/CSV Format/"

file_names = [chr(ord('A')+i)+' Words.csv' for i in range(26)]

count = 0
for filename in file_names:
    f = open(folder_name+filename)
    for line in f.readlines():
        word = line.strip()
        if count % 25 == 0:
            words.append(word)
        count += 1
    f.close()

for word in words:
    print word